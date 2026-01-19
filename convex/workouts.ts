import { mutation } from './_generated/server'
import { v } from 'convex/values'

// Helper function to get authenticated user
async function getAuthenticatedUser(ctx: any): Promise<any | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerkUserId', (q: any) => q.eq('clerkUserId', identity.subject))
    .first()

  return user
}

// Helper function to verify user ownership
async function verifyUserOwnership(
  ctx: any,
  requestedUserId: any
): Promise<{ valid: boolean; error?: string; user?: any }> {
  const user = await getAuthenticatedUser(ctx)
  if (!user) {
    return { valid: false, error: 'Not authenticated' }
  }

  if (user._id !== requestedUserId) {
    return { valid: false, error: 'Unauthorized: Cannot access another user\'s data' }
  }

  return { valid: true, user }
}

// Upsert mutation: Save or update a workout for a specific user and date
export const upsertWorkout = mutation({
  args: {
    planId: v.optional(v.id('plans')),
    userId: v.id('users'),
    date: v.string(), // ISO date string (YYYY-MM-DD)
    plannedWorkout: v.any(), // Full workout object from planData
    status: v.optional(v.union(
      v.literal('planned'),
      v.literal('completed'),
      v.literal('missed'),
      v.literal('adjusted')
    )),
  },
  handler: async (ctx, args) => {
    // Verify ownership - users can only create/update their own workouts
    const ownership = await verifyUserOwnership(ctx, args.userId)
    if (!ownership.valid) {
      throw new Error(ownership.error || 'Unauthorized')
    }

    // Check if workout already exists for this userId and date
    const existingWorkout = await ctx.db
      .query('workouts')
      .withIndex('by_userId_date', (q) =>
        q.eq('userId', args.userId).eq('date', args.date)
      )
      .first()

    if (existingWorkout) {
      // Update existing workout
      await ctx.db.patch(existingWorkout._id, {
        planId: args.planId,
        plannedWorkout: args.plannedWorkout,
        status: args.status || 'planned',
      })
      return { success: true, workoutId: existingWorkout._id, action: 'updated' }
    } else {
      // Insert new workout
      const workoutId = await ctx.db.insert('workouts', {
        planId: args.planId,
        userId: args.userId,
        date: args.date,
        plannedWorkout: args.plannedWorkout,
        status: args.status || 'planned',
      })
      return { success: true, workoutId, action: 'inserted' }
    }
  },
})

// TEMPORARY: Clear all workouts for a user (for debugging/cleanup)
export const clearAllWorkouts = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new Error('Not authenticated')
    }

    // Find user by Clerk ID
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    // Delete all active plans for this user
    const activePlans = await ctx.db
      .query('plans')
      .withIndex('by_userId_active', (q) =>
        q.eq('userId', user._id).eq('isActive', true)
      )
      .collect()

    for (const plan of activePlans) {
      await ctx.db.patch(plan._id, { isActive: false })
    }

    // Delete all workouts for this user
    const workouts = await ctx.db
      .query('workouts')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()

    for (const workout of workouts) {
      await ctx.db.delete(workout._id)
    }

    return { 
      success: true, 
      deletedPlans: activePlans.length,
      deletedWorkouts: workouts.length 
    }
  },
})

export const saveLiveRun = mutation({
  args: {
    startTime: v.number(),
    endTime: v.number(),
    duration: v.number(), // seconds
    totalDistance: v.number(), // miles
    averagePace: v.string(), // MM:SS per mile
    maxHeartRate: v.optional(v.number()),
    averageHeartRate: v.optional(v.number()),
    gpsPoints: v.array(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        timestamp: v.number(),
        altitude: v.optional(v.number()),
        accuracy: v.optional(v.number()),
      })
    ),
    heartRateData: v.array(
      v.object({
        bpm: v.number(),
        timestamp: v.number(),
        zone: v.number(), // 1-5
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new Error('Not authenticated')
    }

    // Find user by Clerk ID
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    // Save the live run
    const runId = await ctx.db.insert('liveRuns', {
      userId: user._id,
      startTime: args.startTime,
      endTime: args.endTime,
      duration: args.duration,
      totalDistance: args.totalDistance,
      averagePace: args.averagePace,
      maxHeartRate: args.maxHeartRate,
      averageHeartRate: args.averageHeartRate,
      gpsPoints: args.gpsPoints,
      heartRateData: args.heartRateData,
      status: 'completed',
      createdAt: Date.now(),
    })

    return { success: true, runId }
  },
})
