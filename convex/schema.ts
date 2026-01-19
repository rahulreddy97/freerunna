import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    onboardingComplete: v.boolean(),
    fitnessLevel: v.optional(v.string()),
    maxHeartRate: v.optional(v.number()),
    stravaLink: v.optional(v.string()),
    isLive: v.boolean(), // For tracking if a user is currently running
    connectionData: v.optional(
      v.object({
        type: v.union(v.literal('link'), v.literal('terra')),
        linkUrl: v.optional(v.string()),
        terraUserId: v.optional(v.string()),
        connectedAt: v.number(),
      })
    ),
    autoStats: v.optional(
      v.object({
        best5K: v.number(), // Minutes (e.g., 22.5 for 22:30)
        fitnessLevel: v.union(
          v.literal('beginner'),
          v.literal('intermediate'),
          v.literal('advanced')
        ),
        analyzedAt: v.number(),
        activitiesAnalyzed: v.number(), // Count of activities analyzed
      })
    ),
    generationProgress: v.optional(
      v.object({
        currentWeek: v.number(),
        totalWeeks: v.number(),
        status: v.union(
          v.literal('generating'),
          v.literal('completed'),
          v.literal('failed')
        ),
        startedAt: v.number(),
      })
    ),
    terraUserId: v.optional(v.string()), // Legacy field, kept for compatibility
    terraApiKey: v.optional(v.string()), // Terra API key for wearable sync
    // Manual entry fields for precision predictions
    age: v.optional(v.number()),
    gender: v.optional(v.union(v.literal('male'), v.literal('female'), v.literal('other'))),
    weeklyMileage: v.optional(v.number()), // Average weekly mileage over last 4 weeks
    manualPRs: v.optional(
      v.object({
        fiveK: v.optional(v.string()), // Format: "MM:SS"
        tenK: v.optional(v.string()),
        halfMarathon: v.optional(v.string()),
        marathon: v.optional(v.string()),
        updatedAt: v.number(),
      })
    ),
    // Computed fitness data (from Strava, Terra, or calculated from PRs)
    vdotScore: v.optional(v.number()), // Jack Daniels VDOT score
    predictedMarathonPace: v.optional(v.string()), // Predicted marathon pace per mile
    accuracyScore: v.optional(v.number()), // 0-100 accuracy score based on data quality
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerkUserId', ['clerkUserId'])
    .index('by_email', ['email'])
    .index('by_isLive', ['isLive']),

  plans: defineTable({
    userId: v.id('users'),
    goalMarathonDate: v.string(),
    startDate: v.string(),
    totalWeeks: v.number(),
    planData: v.any(), // Full JSON TrainingPlan structure
    isActive: v.boolean(),
    adjustments: v.array(v.id('adjustments')),
    createdAt: v.number(),
    lastAdjustedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_active', ['userId', 'isActive']),

  workouts: defineTable({
    planId: v.optional(v.id('plans')),
    userId: v.id('users'),
    date: v.string(), // ISO date string
    plannedWorkout: v.optional(v.any()), // Workout object or null
    actualWorkout: v.optional(
      v.object({
        garminActivityId: v.optional(v.string()),
        distance: v.number(),
        duration: v.number(),
        averagePace: v.string(),
        completed: v.boolean(),
      })
    ),
    liveTrackingData: v.optional(
      v.array(
        v.object({
          latitude: v.number(),
          longitude: v.number(),
          bpm: v.optional(v.number()),
          timestamp: v.number(),
        })
      )
    ),
    status: v.union(
      v.literal('planned'),
      v.literal('completed'),
      v.literal('missed'),
      v.literal('adjusted')
    ),
    completedAt: v.optional(v.number()),
  })
    .index('by_date', ['date'])
    .index('by_userId', ['userId'])
    .index('by_planId', ['planId'])
    .index('by_userId_date', ['userId', 'date']),

  garminActivities: defineTable({
    userId: v.id('users'),
    activityId: v.string(),
    date: v.string(), // ISO date string
    data: v.any(), // GarminActivity object
    matchedWorkoutId: v.optional(v.id('workouts')),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_date', ['date'])
    .index('by_userId_date', ['userId', 'date'])
    .index('by_activityId', ['activityId']),

  whoopRecoveries: defineTable({
    userId: v.id('users'),
    date: v.string(), // ISO date string
    data: v.any(), // WhoopRecovery object
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_date', ['date'])
    .index('by_userId_date', ['userId', 'date']),

  adjustments: defineTable({
    planId: v.id('plans'),
    reason: v.string(),
    affectedDays: v.array(v.string()), // Array of ISO date strings
    adjustmentData: v.any(), // PlanAdjustment object
    createdAt: v.number(),
  })
    .index('by_planId', ['planId']),

  liveRuns: defineTable({
    userId: v.id('users'),
    startTime: v.number(),
    endTime: v.optional(v.number()),
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
    status: v.union(v.literal('active'), v.literal('completed'), v.literal('cancelled')),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_status', ['userId', 'status']),
})
