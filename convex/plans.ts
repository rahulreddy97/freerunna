import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Helper function to verify user ownership
async function verifyUserOwnership(
  ctx: any,
  requestedUserId: any
): Promise<{ valid: boolean; error?: string }> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return { valid: false, error: 'Not authenticated' }
  }

  // Get the user record for the authenticated user
  const authUser = await ctx.db
    .query('users')
    .withIndex('by_clerkUserId', (q: any) => q.eq('clerkUserId', identity.subject))
    .first()

  if (!authUser) {
    return { valid: false, error: 'User not found' }
  }

  // Verify the requested userId matches the authenticated user
  if (authUser._id !== requestedUserId) {
    return { valid: false, error: 'Unauthorized: Cannot access another user\'s data' }
  }

  return { valid: true }
}

export const getActivePlan = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Verify ownership - user can only access their own plan
    const ownership = await verifyUserOwnership(ctx, args.userId)
    if (!ownership.valid) {
      // For queries, return null instead of throwing (prevents UI crashes)
      console.warn('Plan access denied:', ownership.error)
      return null
    }

    const plan = await ctx.db
      .query('plans')
      .withIndex('by_userId_active', (q) =>
        q.eq('userId', args.userId).eq('isActive', true)
      )
      .first()

    return plan
  },
})

export const getTodaysWorkout = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const ownership = await verifyUserOwnership(ctx, args.userId)
    if (!ownership.valid) {
      return null
    }

    const plan = await ctx.db
      .query('plans')
      .withIndex('by_userId_active', (q) =>
        q.eq('userId', args.userId).eq('isActive', true)
      )
      .first()

    if (!plan || !plan.planData || !Array.isArray(plan.planData)) {
      return null
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    // Find today's workout in the plan data
    const todaysWorkout = plan.planData.find(
      (workout: any) => workout.date === today
    )

    if (!todaysWorkout) {
      return null
    }

    return {
      workout: todaysWorkout,
      planId: plan._id,
      week: todaysWorkout.week,
      day: todaysWorkout.day,
    }
  },
})

export const getPlanByWeek = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const ownership = await verifyUserOwnership(ctx, args.userId)
    if (!ownership.valid) {
      return null
    }

    const plan = await ctx.db
      .query('plans')
      .withIndex('by_userId_active', (q) =>
        q.eq('userId', args.userId).eq('isActive', true)
      )
      .first()

    if (!plan || !plan.planData || !Array.isArray(plan.planData)) {
      return null
    }

    // Group workouts by weekNumber (preferred) or week, using date to calculate correct week
    // This ensures workouts are grouped correctly even if week numbers are incorrect
    const workoutsByWeek: Record<number, any[]> = {}
    const seenDates = new Set<string>() // Track seen dates to prevent duplicates
    
    // Calculate start date from plan
    const startDate = plan.startDate ? new Date(plan.startDate) : new Date()
    startDate.setHours(0, 0, 0, 0)
    
    for (const workout of plan.planData) {
      // Skip duplicates based on date
      if (workout.date && seenDates.has(workout.date)) {
        continue
      }
      if (workout.date) {
        seenDates.add(workout.date)
      }
      
      // Use weekNumber if available, otherwise calculate from date or use week
      let week = workout.weekNumber || workout.week || 1
      if (workout.date && (!workout.weekNumber && !workout.week)) {
        const workoutDate = new Date(workout.date)
        workoutDate.setHours(0, 0, 0, 0)
        const daysDiff = Math.floor((workoutDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const calculatedWeek = Math.floor(daysDiff / 7) + 1
        week = calculatedWeek
      }
      
      if (!workoutsByWeek[week]) {
        workoutsByWeek[week] = []
      }
      workoutsByWeek[week].push(workout)
    }

    // Convert to array of week objects, sorted by week number
    // Deduplicate workouts within each week by date
    const weeks = Object.entries(workoutsByWeek)
      .map(([weekNum, workouts]) => {
        // Remove duplicates within the week (same date)
        const uniqueWorkouts = workouts.filter((w, index, self) => 
          index === self.findIndex((w2) => w2.date === w.date)
        )
        
        // Validate: Each week should have exactly 7 days (including rest days)
        // But only count non-rest workouts for the run count
        const runsCount = uniqueWorkouts.filter((w) => w.type !== 'rest').length
        
        // Log warning if a week has more than 7 workouts (shouldn't happen)
        if (uniqueWorkouts.length > 7) {
          console.warn(`Week ${weekNum} has ${uniqueWorkouts.length} workouts (expected max 7). Dates:`, 
            uniqueWorkouts.map((w: any) => w.date).join(', '))
        }
        
        return {
          week: parseInt(weekNum, 10),
          workouts: uniqueWorkouts.sort((a, b) => {
            // Sort by date if available, otherwise by dayNumber or day
            if (a.date && b.date) {
              return a.date.localeCompare(b.date)
            }
            return (a.dayNumber || a.day || 1) - (b.dayNumber || b.day || 1)
          }),
          runsCount, // Add runs count for debugging
        }
      })
      .sort((a, b) => a.week - b.week)

    return {
      planId: plan._id,
      totalWeeks: plan.totalWeeks,
      goalMarathonDate: plan.goalMarathonDate,
      weeks,
    }
  },
})

export const createPlan = mutation({
  args: {
    userId: v.id('users'),
    goalMarathonDate: v.string(),
    startDate: v.string(),
    totalWeeks: v.number(),
    planData: v.any(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Verify ownership - users can only create plans for themselves
    const ownership = await verifyUserOwnership(ctx, args.userId)
    if (!ownership.valid) {
      throw new Error(ownership.error || 'Unauthorized')
    }

    // Deactivate any existing active plans for this user
    const existingPlans = await ctx.db
      .query('plans')
      .withIndex('by_userId_active', (q) =>
        q.eq('userId', args.userId).eq('isActive', true)
      )
      .collect()

    for (const plan of existingPlans) {
      await ctx.db.patch(plan._id, {
        isActive: false,
        lastAdjustedAt: Date.now(),
      })
    }

    // Check if a plan with the same goalMarathonDate and startDate already exists
    // This prevents duplicates if the AI action is retried
    const existingPlan = await ctx.db
      .query('plans')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .filter((q) => 
        q.and(
          q.eq(q.field('goalMarathonDate'), args.goalMarathonDate),
          q.eq(q.field('startDate'), args.startDate)
        )
      )
      .first()

    let planId
    if (existingPlan) {
      // Update existing plan instead of creating duplicate
      planId = existingPlan._id
      await ctx.db.patch(planId, {
        goalMarathonDate: args.goalMarathonDate,
        startDate: args.startDate,
        totalWeeks: args.totalWeeks,
        planData: args.planData,
        isActive: args.isActive,
        lastAdjustedAt: Date.now(),
      })
    } else {
      // Create new plan
      planId = await ctx.db.insert('plans', {
        userId: args.userId,
        goalMarathonDate: args.goalMarathonDate,
        startDate: args.startDate,
        totalWeeks: args.totalWeeks,
        planData: args.planData,
        isActive: args.isActive,
        adjustments: [],
        createdAt: Date.now(),
        lastAdjustedAt: Date.now(),
      })
    }

    return planId
  },
})

