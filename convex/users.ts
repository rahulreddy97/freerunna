import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const storeUser = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new Error('Not authenticated')
    }

    // Verify the clerkUserId matches the authenticated user
    if (identity.subject !== args.clerkUserId) {
      throw new Error('Unauthorized: clerkUserId does not match authenticated user')
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
      .first()

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        updatedAt: Date.now(),
      })
      return existingUser._id
    }

    // Create new user
    const now = Date.now()
    const userId = await ctx.db.insert('users', {
      clerkUserId: args.clerkUserId,
      email: args.email,
      onboardingComplete: false,
      isLive: false,
      createdAt: now,
      updatedAt: now,
    })

    return userId
  },
})

export const updateUserProfile = mutation({
  args: {
    fitnessLevel: v.optional(v.string()),
    maxHeartRate: v.optional(v.number()),
    stravaLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new Error('Not authenticated')
    }

    // Find user by Clerk ID using the index
    let user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
      .first()

    // If user doesn't exist, create them automatically (zero-onboarding flow)
    if (!user) {
      const now = Date.now()
      const userId = await ctx.db.insert('users', {
        clerkUserId: identity.subject,
        email: identity.email || '',
        onboardingComplete: false,
        isLive: false,
        createdAt: now,
        updatedAt: now,
      })
      user = await ctx.db.get(userId)
      if (!user) {
        throw new Error('Failed to create user')
      }
    }

    // Update user profile
    const updateData: any = {
      updatedAt: Date.now(),
    }

    if (args.fitnessLevel !== undefined) {
      updateData.fitnessLevel = args.fitnessLevel
    }
    if (args.maxHeartRate !== undefined) {
      updateData.maxHeartRate = args.maxHeartRate
    }
    if (args.stravaLink !== undefined) {
      updateData.stravaLink = args.stravaLink
    }

    await ctx.db.patch(user._id, updateData)

    return { success: true, userId: user._id }
  },
})

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      return null
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
      .first()

    // Return user if found, otherwise return a "needs creation" flag
    // The mutation will handle actual creation
    if (!user) {
      return { needsCreation: true, clerkUserId: identity.subject, email: identity.email || '' }
    }

    return user
  },
})

// Mutation to create user on first login (called from client when user doesn't exist)
export const ensureUserExists = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new Error('Not authenticated')
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
      .first()

    if (existingUser) {
      return existingUser._id
    }

    // Create new user
    const now = Date.now()
    const userId = await ctx.db.insert('users', {
      clerkUserId: identity.subject,
      email: identity.email || '',
      onboardingComplete: false,
      isLive: false,
      createdAt: now,
      updatedAt: now,
    })

    return userId
  },
})

export const getUserById = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId)
  },
})

export const connectData = mutation({
  args: {
    connectionType: v.union(v.literal('link'), v.literal('terra')),
    linkUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new Error('Not authenticated')
    }

    // Find user by Clerk ID using the index
    let user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
      .first()

    // If user doesn't exist, create them automatically (zero-onboarding flow)
    if (!user) {
      const now = Date.now()
      const userId = await ctx.db.insert('users', {
        clerkUserId: identity.subject,
        email: identity.email || '',
        onboardingComplete: false,
        isLive: false,
        createdAt: now,
        updatedAt: now,
      })
      user = await ctx.db.get(userId)
      if (!user) {
        throw new Error('Failed to create user')
      }
    }

    const connectionData = {
      type: args.connectionType,
      linkUrl: args.linkUrl,
      connectedAt: Date.now(),
    }

    const updateData: any = {
      onboardingComplete: true,
      connectionData,
      updatedAt: Date.now(),
    }

    // If linkUrl is provided and it's a Strava link, store it
    if (args.linkUrl && args.linkUrl.includes('strava.com')) {
      updateData.stravaLink = args.linkUrl
    }

    await ctx.db.patch(user._id, updateData)

    return { success: true, userId: user._id }
  },
})

export const analyzeActivities = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new Error('Not authenticated')
    }

    // Find user by Clerk ID using the index
    let user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
      .first()

    // If user doesn't exist, create them automatically (zero-onboarding flow)
    if (!user) {
      const now = Date.now()
      const userId = await ctx.db.insert('users', {
        clerkUserId: identity.subject,
        email: identity.email || '',
        onboardingComplete: false,
        isLive: false,
        createdAt: now,
        updatedAt: now,
      })
      user = await ctx.db.get(userId)
      if (!user) {
        throw new Error('Failed to create user')
      }
    }

    if (!user.connectionData) {
      throw new Error('User not connected. Please connect your data first.')
    }

    // In a real implementation, this would:
    // 1. Fetch activities from Terra API or scrape from link
    // 2. Use Gemini AI to analyze the last 3 months
    // 3. Determine best 5K time and fitness level
    // For now, we'll simulate this with placeholder logic

    // Simulate AI analysis (replace with actual Gemini API call)
    // This would analyze activities and determine:
    // - Best 5K time from recent runs
    // - Fitness level based on pace, distance, frequency

    // Placeholder: Generate realistic stats based on connection type
    const simulatedBest5K = 20 + Math.random() * 10 // 20-30 minutes
    const activitiesCount = Math.floor(Math.random() * 50) + 20 // 20-70 activities

    // Determine fitness level based on simulated 5K time
    let fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
    if (simulatedBest5K < 22) {
      fitnessLevel = 'advanced'
    } else if (simulatedBest5K < 26) {
      fitnessLevel = 'intermediate'
    } else {
      fitnessLevel = 'beginner'
    }

    const autoStats = {
      best5K: simulatedBest5K,
      fitnessLevel,
      analyzedAt: Date.now(),
      activitiesAnalyzed: activitiesCount,
    }

    const updateData: any = {
      autoStats,
      updatedAt: Date.now(),
    }

    // Also update fitnessLevel from autoStats if available
    if (autoStats.fitnessLevel) {
      updateData.fitnessLevel = autoStats.fitnessLevel
    }

    await ctx.db.patch(user._id, updateData)

    return { success: true, stats: autoStats }
  },
})

export const setLiveStatus = mutation({
  args: {
    isLive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new Error('Not authenticated')
    }

    // Find user by Clerk ID using the index
    let user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
      .first()

    // If user doesn't exist, create them automatically (zero-onboarding flow)
    if (!user) {
      const now = Date.now()
      const userId = await ctx.db.insert('users', {
        clerkUserId: identity.subject,
        email: identity.email || '',
        onboardingComplete: false,
        isLive: false,
        createdAt: now,
        updatedAt: now,
      })
      user = await ctx.db.get(userId)
      if (!user) {
        throw new Error('Failed to create user')
      }
    }

    await ctx.db.patch(user._id, {
      isLive: args.isLive,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

export const updateConnections = mutation({
  args: {
    stravaLink: v.optional(v.string()),
    terraApiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new Error('Not authenticated')
    }

    // Find user by Clerk ID using the index
    let user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
      .first()

    // If user doesn't exist, create them automatically
    if (!user) {
      const now = Date.now()
      const userId = await ctx.db.insert('users', {
        clerkUserId: identity.subject,
        email: identity.email || '',
        onboardingComplete: false,
        isLive: false,
        createdAt: now,
        updatedAt: now,
      })
      user = await ctx.db.get(userId)
      if (!user) {
        throw new Error('Failed to create user')
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    }

    if (args.stravaLink !== undefined) {
      updateData.stravaLink = args.stravaLink || undefined
    }
    if (args.terraApiKey !== undefined) {
      updateData.terraApiKey = args.terraApiKey || undefined
    }

    // Mark onboarding complete if any connection is provided
    if (args.stravaLink || args.terraApiKey) {
      updateData.onboardingComplete = true
    }

    await ctx.db.patch(user._id, updateData)

    return { success: true, userId: user._id }
  },
})

// VDOT calculation based on Jack Daniels' Running Formula
// This is a simplified approximation - the actual formula is more complex
function calculateVDOT(timeInMinutes: number, distanceInKm: number): number {
  // Percent VO2max calculation
  const velocity = distanceInKm / timeInMinutes // km per minute
  const percentVO2max = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeInMinutes) + 
                        0.2989558 * Math.exp(-0.1932605 * timeInMinutes)
  
  // VO2 at velocity
  const vo2AtVelocity = -4.60 + 0.182258 * velocity * 1000 + 
                        0.000104 * Math.pow(velocity * 1000, 2)
  
  // VDOT
  return vo2AtVelocity / percentVO2max
}

// Calculate accuracy score based on data completeness
function calculateAccuracyScore(user: any): number {
  let score = 50 // Base score
  
  // Strava/Terra connected (+20)
  if (user.stravaLink || user.terraApiKey) score += 20
  
  // Manual PRs provided (+15)
  if (user.manualPRs?.fiveK || user.manualPRs?.tenK || user.manualPRs?.halfMarathon) score += 15
  
  // Weekly mileage provided (+10)
  if (user.weeklyMileage && user.weeklyMileage > 0) score += 10
  
  // Age provided (+3)
  if (user.age) score += 3
  
  // Gender provided (+2)
  if (user.gender) score += 2
  
  return Math.min(100, score)
}

// Parse time string "MM:SS" or "HH:MM:SS" to minutes
function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 2) {
    return parts[0] + parts[1] / 60
  } else if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + parts[2] / 60
  }
  return 0
}

// Calculate predicted marathon pace using Riegel formula with mileage adjustment
function calculateMarathonPace(
  prTimeMinutes: number,
  prDistanceKm: number,
  weeklyMileage: number
): string {
  const marathonDistanceKm = 42.195
  
  // Mileage Tax: adjust Riegel exponent based on weekly mileage
  // < 30 miles/week: 1.08 (fatigue penalty)
  // 30-50 miles/week: 1.06 (standard)
  // > 50 miles/week: 1.05 (endurance bonus)
  let riegelExponent = 1.06
  if (weeklyMileage < 30) {
    riegelExponent = 1.08
  } else if (weeklyMileage > 50) {
    riegelExponent = 1.05
  }
  
  // Riegel formula: T2 = T1 × (D2 / D1)^exponent
  const marathonTimeMinutes = prTimeMinutes * Math.pow(marathonDistanceKm / prDistanceKm, riegelExponent)
  
  // Convert to pace per mile
  const marathonDistanceMiles = 26.2
  const pacePerMile = marathonTimeMinutes / marathonDistanceMiles
  
  const mins = Math.floor(pacePerMile)
  const secs = Math.round((pacePerMile - mins) * 60)
  
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const updateManualStats = mutation({
  args: {
    age: v.optional(v.number()),
    gender: v.optional(v.union(v.literal('male'), v.literal('female'), v.literal('other'))),
    weeklyMileage: v.optional(v.number()),
    fiveKPR: v.optional(v.string()),
    tenKPR: v.optional(v.string()),
    halfMarathonPR: v.optional(v.string()),
    marathonPR: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      throw new Error('Not authenticated')
    }

    // Find user by Clerk ID
    let user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', identity.subject))
      .first()

    // If user doesn't exist, create them
    if (!user) {
      const now = Date.now()
      const userId = await ctx.db.insert('users', {
        clerkUserId: identity.subject,
        email: identity.email || '',
        onboardingComplete: false,
        isLive: false,
        createdAt: now,
        updatedAt: now,
      })
      user = await ctx.db.get(userId)
      if (!user) {
        throw new Error('Failed to create user')
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    }

    // Update basic fields
    if (args.age !== undefined) {
      updateData.age = args.age
    }
    if (args.gender !== undefined) {
      updateData.gender = args.gender
    }
    if (args.weeklyMileage !== undefined) {
      updateData.weeklyMileage = args.weeklyMileage
    }

    // Update manual PRs
    const hasPRs = args.fiveKPR || args.tenKPR || args.halfMarathonPR || args.marathonPR
    if (hasPRs) {
      updateData.manualPRs = {
        fiveK: args.fiveKPR || user.manualPRs?.fiveK,
        tenK: args.tenKPR || user.manualPRs?.tenK,
        halfMarathon: args.halfMarathonPR || user.manualPRs?.halfMarathon,
        marathon: args.marathonPR || user.manualPRs?.marathon,
        updatedAt: Date.now(),
      }

      // Calculate VDOT from best available PR (priority: 5K > 10K > HM > Marathon)
      let vdot = 0
      if (args.fiveKPR) {
        const timeMin = parseTimeToMinutes(args.fiveKPR)
        if (timeMin > 0) vdot = calculateVDOT(timeMin, 5)
      } else if (args.tenKPR) {
        const timeMin = parseTimeToMinutes(args.tenKPR)
        if (timeMin > 0) vdot = calculateVDOT(timeMin, 10)
      } else if (args.halfMarathonPR) {
        const timeMin = parseTimeToMinutes(args.halfMarathonPR)
        if (timeMin > 0) vdot = calculateVDOT(timeMin, 21.0975)
      } else if (args.marathonPR) {
        const timeMin = parseTimeToMinutes(args.marathonPR)
        if (timeMin > 0) vdot = calculateVDOT(timeMin, 42.195)
      }
      
      if (vdot > 0) {
        updateData.vdotScore = Math.round(vdot * 10) / 10
      }

      // Calculate predicted marathon pace
      const weeklyMileage = args.weeklyMileage || user.weeklyMileage || 25
      let marathonPace = ''
      
      if (args.fiveKPR) {
        marathonPace = calculateMarathonPace(parseTimeToMinutes(args.fiveKPR), 5, weeklyMileage)
      } else if (args.tenKPR) {
        marathonPace = calculateMarathonPace(parseTimeToMinutes(args.tenKPR), 10, weeklyMileage)
      } else if (args.halfMarathonPR) {
        marathonPace = calculateMarathonPace(parseTimeToMinutes(args.halfMarathonPR), 21.0975, weeklyMileage)
      }
      
      if (marathonPace) {
        updateData.predictedMarathonPace = marathonPace
      }
    }

    // Mark onboarding complete if we have enough data
    if (hasPRs || args.weeklyMileage) {
      updateData.onboardingComplete = true
    }

    // First apply updates
    await ctx.db.patch(user._id, updateData)

    // Recalculate accuracy score with updated data
    const updatedUser = await ctx.db.get(user._id)
    if (updatedUser) {
      const accuracyScore = calculateAccuracyScore(updatedUser)
      await ctx.db.patch(user._id, { accuracyScore })
    }

    return { success: true, userId: user._id }
  },
})

export const updateGenerationProgress = mutation({
  args: {
    userId: v.id('users'),
    currentWeek: v.number(),
    totalWeeks: v.number(),
    status: v.union(v.literal('generating'), v.literal('completed'), v.literal('failed')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    const generationProgress = {
      currentWeek: args.currentWeek,
      totalWeeks: args.totalWeeks,
      status: args.status,
      startedAt: user.generationProgress?.startedAt || Date.now(),
    }

    await ctx.db.patch(args.userId, {
      generationProgress,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})
