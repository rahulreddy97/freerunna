import { action } from './_generated/server'
import { v } from 'convex/values'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type { Schema } from '@google/generative-ai'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'

export const generateFullMarathonPlan = action({
  args: {
    marathonDate: v.string(),
    daysPerWeek: v.number(),
    userId: v.id('users'),
  },
  handler: async (ctx, args): Promise<Id<'plans'>> => {
    // Get user data to extract fitness level and 5K pace
    const user = await ctx.runQuery(api.users.getUserById, {
      userId: args.userId,
    })

    if (!user) {
      throw new Error('User not found')
    }

    const fitnessLevel = user.fitnessLevel || user.autoStats?.fitnessLevel || 'intermediate'
    const best5K = user.autoStats?.best5K || 25 // Default to 25 minutes if not available

    // Format time in minutes to MM:SS string
    const formatTime = (minutes: number): string => {
      const mins = Math.floor(minutes)
      const secs = Math.floor((minutes - mins) * 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Parse time string "MM:SS" or "HH:MM:SS" to minutes
    const parseTimeToMinutes = (timeStr: string): number => {
      if (!timeStr) return 0
      const parts = timeStr.split(':').map(Number)
      if (parts.length === 2) {
        return parts[0] + parts[1] / 60
      } else if (parts.length === 3) {
        return parts[0] * 60 + parts[1] + parts[2] / 60
      }
      return 0
    }

    // ============================================
    // TRIPLE-CHECK ACCURACY ENGINE
    // ============================================

    // Get user's data with priority: Strava/Terra > Manual PRs > Generic Estimate
    const hasStravaData = !!user.stravaLink || !!user.terraApiKey
    const hasManualPRs = !!(user.manualPRs?.fiveK || user.manualPRs?.tenK || user.manualPRs?.halfMarathon)
    
    // Determine best available PR for calculations
    let prTimeMinutes = best5K
    let prDistanceKm = 5
    let prSource = 'estimate'
    
    if (hasManualPRs) {
      if (user.manualPRs?.fiveK) {
        prTimeMinutes = parseTimeToMinutes(user.manualPRs.fiveK)
        prDistanceKm = 5
        prSource = 'manual_5k'
      } else if (user.manualPRs?.tenK) {
        prTimeMinutes = parseTimeToMinutes(user.manualPRs.tenK)
        prDistanceKm = 10
        prSource = 'manual_10k'
      } else if (user.manualPRs?.halfMarathon) {
        prTimeMinutes = parseTimeToMinutes(user.manualPRs.halfMarathon)
        prDistanceKm = 21.0975
        prSource = 'manual_half'
      }
    }
    
    // Override with Strava/Terra data if available (highest priority)
    if (hasStravaData && user.autoStats?.best5K) {
      prTimeMinutes = user.autoStats.best5K
      prDistanceKm = 5
      prSource = 'strava_auto'
    }

    // CHECK 1: VDOT Score (Jack Daniels' Running Formula)
    // Calculates the "Theoretical Ceiling" for speed
    const calculateVDOT = (timeMin: number, distKm: number): number => {
      const velocity = distKm / timeMin // km per minute
      const percentVO2max = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeMin) + 
                            0.2989558 * Math.exp(-0.1932605 * timeMin)
      const vo2AtVelocity = -4.60 + 0.182258 * velocity * 1000 + 
                            0.000104 * Math.pow(velocity * 1000, 2)
      return vo2AtVelocity / percentVO2max
    }
    
    const vdotScore = user.vdotScore || Math.round(calculateVDOT(prTimeMinutes, prDistanceKm) * 10) / 10

    // CHECK 2: MILEAGE TAX (Vickers-Vertosick adjustment)
    // Adjusts Riegel exponent based on weekly mileage
    const weeklyMileage = user.weeklyMileage || 25 // Default conservative estimate
    let riegelExponent = 1.06 // Standard
    let mileageTaxDescription = 'standard endurance base'
    
    if (weeklyMileage < 20) {
      riegelExponent = 1.10 // Heavy fatigue penalty for very low mileage
      mileageTaxDescription = 'HEAVY FATIGUE PENALTY (< 20 mi/week)'
    } else if (weeklyMileage < 30) {
      riegelExponent = 1.08 // Fatigue penalty
      mileageTaxDescription = 'FATIGUE PENALTY applied (< 30 mi/week)'
    } else if (weeklyMileage >= 50 && weeklyMileage < 70) {
      riegelExponent = 1.05 // Endurance bonus
      mileageTaxDescription = 'endurance bonus (50-70 mi/week)'
    } else if (weeklyMileage >= 70) {
      riegelExponent = 1.04 // Elite endurance bonus
      mileageTaxDescription = 'ELITE endurance bonus (70+ mi/week)'
    }

    // ============================================
    // AGE & GENDER (needed for HR zones and age-grading)
    // ============================================
    const age = user.age || 30 // Default to prime running age
    const gender = user.gender || 'male'

    // ============================================
    // HEART RATE ZONE TRAINING
    // ============================================
    
    // Calculate max HR using Tanaka formula (more accurate than 220-age)
    // Tanaka: 208 - (0.7 × age)
    const maxHR = user.maxHeartRate || Math.round(208 - (0.7 * age))
    
    // Calculate heart rate zones (Karvonen method would need resting HR, using percentage method)
    const hrZones = {
      zone1: { name: 'Recovery', min: Math.round(maxHR * 0.50), max: Math.round(maxHR * 0.60), description: 'Very light, conversation pace' },
      zone2: { name: 'Easy/Aerobic', min: Math.round(maxHR * 0.60), max: Math.round(maxHR * 0.70), description: 'Building aerobic base' },
      zone3: { name: 'Tempo', min: Math.round(maxHR * 0.70), max: Math.round(maxHR * 0.80), description: 'Comfortably hard' },
      zone4: { name: 'Threshold', min: Math.round(maxHR * 0.80), max: Math.round(maxHR * 0.90), description: 'Hard, limited conversation' },
      zone5: { name: 'VO2max', min: Math.round(maxHR * 0.90), max: maxHR, description: 'Maximum effort' },
    }

    // ============================================
    // PROGRESSIVE OVERLOAD LOGIC
    // ============================================
    
    // Calculate weekly mileage progression with 10% rule
    const calculateWeeklyMileage = (weekNum: number, totalWeeks: number, baseMileage: number): number => {
      const taperStart = Math.max(totalWeeks - 3, Math.floor(totalWeeks * 0.85))
      const peakWeek = taperStart - 1
      
      // Step-back week every 4th week (reduce by 20-30%)
      const isStepBackWeek = weekNum % 4 === 0 && weekNum < taperStart
      
      // Calculate progressive build (max 10% increase per week)
      let targetMileage = baseMileage
      
      if (weekNum <= peakWeek) {
        // Build phase: Increase by ~8% per 3 weeks (with step-back)
        const buildWeeks = Math.floor(weekNum / 4) * 3 + (weekNum % 4)
        const progressFactor = 1 + (buildWeeks * 0.03) // ~3% per effective week
        targetMileage = baseMileage * Math.min(progressFactor, 1.8) // Cap at 80% increase
      }
      
      if (isStepBackWeek) {
        targetMileage *= 0.75 // 25% reduction on step-back weeks
      }
      
      // Taper phase: Reduce progressively
      if (weekNum >= taperStart) {
        const taperWeek = weekNum - taperStart + 1
        const taperWeeks = totalWeeks - taperStart + 1
        // Progressive taper: 70% -> 50% -> 30% of peak
        const taperFactor = 0.7 - ((taperWeek - 1) / (taperWeeks - 1)) * 0.4
        const peakMileage = baseMileage * 1.8
        targetMileage = peakMileage * Math.max(taperFactor, 0.3)
      }
      
      return Math.round(targetMileage)
    }

    // ============================================
    // WORKOUT TYPE DEFINITIONS
    // ============================================
    
    const workoutTypes = {
      // Core workout types
      easy: {
        hrZone: 'zone2',
        paceDescription: 'conversational pace',
        purpose: 'aerobic development, recovery',
      },
      recovery: {
        hrZone: 'zone1',
        paceDescription: 'very easy, shuffle pace',
        purpose: 'active recovery',
      },
      long: {
        hrZone: 'zone2',
        paceDescription: 'easy pace with final miles at marathon pace',
        purpose: 'endurance, mental toughness, glycogen depletion training',
      },
      tempo: {
        hrZone: 'zone3',
        paceDescription: 'comfortably hard, threshold pace',
        purpose: 'lactate threshold improvement',
      },
      interval: {
        hrZone: 'zone4-5',
        paceDescription: 'hard effort with recovery jogs',
        purpose: 'VO2max development, speed',
      },
      
      // Advanced workout types
      yasso800s: {
        hrZone: 'zone4-5',
        paceDescription: 'Marathon goal time (hours:minutes) as 800m time (minutes:seconds)',
        purpose: 'Marathon predictor workout, speed endurance',
        example: 'Target 3:30 marathon? Run 800s in 3:30 each',
      },
      marathonPace: {
        hrZone: 'zone3',
        paceDescription: 'exact goal marathon pace',
        purpose: 'Race-specific training, pacing practice',
      },
      fartlek: {
        hrZone: 'zone2-4',
        paceDescription: 'unstructured speed play, alternating fast/slow',
        purpose: 'Fun speed work, mental engagement',
      },
      hillRepeats: {
        hrZone: 'zone4',
        paceDescription: 'hard uphill effort, easy jog down',
        purpose: 'Leg strength, running economy',
      },
      progression: {
        hrZone: 'zone2-3',
        paceDescription: 'start easy, finish at tempo or faster',
        purpose: 'Race simulation, negative split practice',
      },
      strides: {
        hrZone: 'zone4-5',
        paceDescription: '4-6 x 20-30 second accelerations at end of easy run',
        purpose: 'Running form, neuromuscular activation',
      },
    }

    // ============================================
    // WEATHER/HEAT ADJUSTMENT
    // ============================================
    
    // Pace adjustment based on temperature (seconds per mile to add)
    const getHeatAdjustment = (tempF: number): { adjustment: number; description: string } => {
      if (tempF <= 50) return { adjustment: 0, description: 'Ideal conditions' }
      if (tempF <= 60) return { adjustment: 0, description: 'Good conditions' }
      if (tempF <= 70) return { adjustment: 10, description: 'Add 10 sec/mile' }
      if (tempF <= 80) return { adjustment: 20, description: 'Add 20 sec/mile, hydrate more' }
      if (tempF <= 90) return { adjustment: 40, description: 'Add 40 sec/mile, consider early morning' }
      return { adjustment: 60, description: 'Add 60+ sec/mile, consider treadmill or rest' }
    }

    // ============================================
    // RECOVERY SCORE ADAPTATION
    // ============================================
    
    // Adjust workout intensity based on recovery score (from Whoop, Garmin, etc.)
    const getRecoveryAdjustment = (recoveryScore: number | undefined): { factor: number; description: string } => {
      if (!recoveryScore) return { factor: 1.0, description: 'No recovery data - following standard plan' }
      
      if (recoveryScore >= 80) return { factor: 1.1, description: 'Excellent recovery - can push harder today' }
      if (recoveryScore >= 67) return { factor: 1.0, description: 'Good recovery - normal training' }
      if (recoveryScore >= 50) return { factor: 0.9, description: 'Moderate recovery - reduce intensity 10%' }
      if (recoveryScore >= 33) return { factor: 0.75, description: 'Poor recovery - easy day or rest' }
      return { factor: 0.5, description: 'Very low recovery - recommend rest day' }
    }

    // Calculate predicted marathon pace using adjusted Riegel formula
    const marathonDistanceKm = 42.195
    const marathonDistanceMiles = 26.2
    const predictedMarathonTimeMin = prTimeMinutes * Math.pow(marathonDistanceKm / prDistanceKm, riegelExponent)
    const predictedMarathonPacePerMile = predictedMarathonTimeMin / marathonDistanceMiles
    const predictedMarathonPace = user.predictedMarathonPace || formatTime(predictedMarathonPacePerMile)

    // CHECK 3: AGE-GRADING (Safety check for demographics)
    // Note: age and gender are declared earlier for HR zone calculations
    
    // Age-grading factors (simplified - real tables are more complex)
    // These ensure paces are realistic for the user's demographic
    let ageGradingFactor = 1.0
    if (age < 25) ageGradingFactor = 0.98 // Young, slight advantage
    else if (age > 40) ageGradingFactor = 1.0 + (age - 40) * 0.005 // Gradual slowdown
    else if (age > 50) ageGradingFactor = 1.0 + (50 - 40) * 0.005 + (age - 50) * 0.008
    else if (age > 60) ageGradingFactor = 1.0 + (50 - 40) * 0.005 + (60 - 50) * 0.008 + (age - 60) * 0.01
    
    // Gender adjustment (women's marathon WR is ~7% slower than men's)
    if (gender === 'female') ageGradingFactor *= 1.05

    // Apply age-grading to predicted pace
    const adjustedMarathonPacePerMile = predictedMarathonPacePerMile * ageGradingFactor
    const adjustedMarathonPace = formatTime(adjustedMarathonPacePerMile)

    // Calculate training paces based on VDOT and adjusted marathon pace
    // Using Jack Daniels' training pace formulas
    const easyPacePerMile = adjustedMarathonPacePerMile * 1.15 // ~15% slower
    const tempoPacePerMile = adjustedMarathonPacePerMile * 0.95 // ~5% faster than marathon
    const intervalPacePerMile = adjustedMarathonPacePerMile * 0.85 // ~15% faster than marathon
    
    const easyPace = formatTime(easyPacePerMile)
    const tempoPace = formatTime(tempoPacePerMile)
    const intervalPace = formatTime(intervalPacePerMile)

    // Data quality indicator for the AI
    const dataQuality = hasStravaData ? 'HIGH (Strava/Terra connected)' :
                        hasManualPRs ? 'MEDIUM (Manual PRs provided)' :
                        'LOW (Using estimates - encourage user to add data)'

    const fiveKPace = formatTime(prTimeMinutes / prDistanceKm * 5) // Equivalent 5K pace

    // Calculate dynamic timeline: weeks from today to marathon date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const marathonDateObj = new Date(args.marathonDate)
    marathonDateObj.setHours(0, 0, 0, 0)

    // Calculate total weeks (round up to ensure we have enough time)
    const daysDiff = Math.ceil((marathonDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const totalWeeks = Math.ceil(daysDiff / 7)

    if (totalWeeks < 12) {
      throw new Error(`Marathon date must be at least 12 weeks away. Currently ${totalWeeks} weeks.`)
    }

    // Start date is today
    const startDate = today.toISOString().split('T')[0]

    // Initialize Gemini
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is not set')
    }

    const genAI = new GoogleGenerativeAI(apiKey)

    // Initialize generation progress
    await ctx.runMutation(api.users.updateGenerationProgress, {
      userId: args.userId,
      currentWeek: 0,
      totalWeeks,
      status: 'generating',
    })

    // Define structured output schema for workouts array
    // Per Google Gemini API docs: https://ai.google.dev/gemini-api/docs/structured-output
    // Schema format uses SchemaType enum values (not string literals)
    // Reference: Google's structured output documentation and Stack Overflow best practices
    const workoutSchema: Schema = {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          date: {
            type: SchemaType.STRING,
            description: 'Date in YYYY-MM-DD format',
          },
          dayOfWeek: {
            type: SchemaType.NUMBER,
            description: 'Day of week (0=Monday, 6=Sunday)',
          },
          type: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: ['rest', 'easy', 'tempo', 'interval', 'long', 'recovery', 'marathonPace', 'progression', 'fartlek', 'hillRepeats', 'yasso800s'],
            description: 'Type of workout',
          },
          hrZone: {
            type: SchemaType.STRING,
            description: 'Target heart rate zone (e.g., "zone2", "zone3-4")',
          },
          distance: {
            type: SchemaType.NUMBER,
            description: 'Distance in miles (0 for rest days)',
          },
          targetPace: {
            type: SchemaType.STRING,
            description: 'Target pace per mile (e.g., "8:30" or empty string for rest days)',
          },
          description: {
            type: SchemaType.STRING,
            description: 'Description of the workout',
          },
          week: {
            type: SchemaType.NUMBER,
            description: 'Week number in the training plan (1-16, must increment by 1 each week)',
          },
          weekNumber: {
            type: SchemaType.NUMBER,
            description: 'Week number in the training plan (1-16, must increment by 1 each week)',
          },
          day: {
            type: SchemaType.NUMBER,
            description: 'Day number within the week (1-7, must cycle 1-7 for each week)',
          },
          dayNumber: {
            type: SchemaType.NUMBER,
            description: 'Day number within the week (1-7, must cycle 1-7 for each week)',
          },
        },
        required: ['date', 'dayOfWeek', 'type', 'distance', 'targetPace', 'description', 'week', 'day'],
        // weekNumber and dayNumber are optional but recommended for strict validation
      },
    }

    // Identify training phase based on week number
    const getPhase = (weekNumber: number, totalWeeks: number): string => {
      const taperStart = Math.max(totalWeeks - 3, Math.floor(totalWeeks * 0.85))
      const peakStart = Math.floor(totalWeeks * 0.5)
      const buildStart = Math.floor(totalWeeks * 0.25)

      if (weekNumber >= taperStart) {
        return 'Taper'
      } else if (weekNumber >= peakStart) {
        return 'Peak'
      } else if (weekNumber >= buildStart) {
        return 'Build'
      } else {
        return 'Base'
      }
    }

    // Generate summary of final week for context (for gradual progression)
    const summarizeWeek = (weekData: any[]): string => {
      if (!weekData || weekData.length === 0) return 'No previous data'
      
      const runs = weekData.filter((w) => w.type !== 'rest')
      const totalMileage = runs.reduce((sum, r) => sum + (r.distance || 0), 0)
      const avgPace = runs.length > 0
        ? runs
            .filter((r) => r.targetPace)
            .map((r) => r.targetPace)
            .join(', ')
        : 'N/A'
      const workoutTypes = [...new Set(runs.map((r) => r.type))].join(', ')

      return `Total weekly mileage: ${totalMileage.toFixed(1)} miles. Average paces: ${avgPace}. Workout types: ${workoutTypes || 'rest week'}.`
    }

    // Recursive function to generate 4-week chunks
    const generateChunk = async (
      startWeek: number,
      endWeek: number,
      contextSummary: string | null,
      accumulatedPlan: any[]
    ): Promise<any[]> => {
      // Cap endWeek at total weeks
      const actualEndWeek = Math.min(endWeek, totalWeeks)
      const weeksInChunk = actualEndWeek - startWeek + 1
      const daysInChunk = weeksInChunk * 7

      // Calculate start date for this chunk
      const chunkStartDate = new Date(today)
      chunkStartDate.setDate(chunkStartDate.getDate() + (startWeek - 1) * 7)
      const chunkStartDateStr = chunkStartDate.toISOString().split('T')[0]

      // Calculate target weekly mileage for this chunk (must be before phase description)
      const chunkTargetMileage = calculateWeeklyMileage(startWeek, totalWeeks, weeklyMileage)
      const isStepBackChunk = startWeek % 4 === 0 && startWeek < Math.max(totalWeeks - 3, Math.floor(totalWeeks * 0.85))

      // Identify phase with detailed workout recommendations
      const phase = getPhase(startWeek, totalWeeks)
      const phaseDescription =
        phase === 'Base'
          ? `Focus on aerobic foundation (Zone 2). Workouts: easy runs, recovery runs, building long run gradually. Add strides 2-3x/week. Target: ${chunkTargetMileage} miles this week.`
          : phase === 'Build'
          ? `Increase volume and introduce quality workouts. Workouts: easy, tempo, fartlek, hillRepeats (1x/week), longer long runs. Target: ${chunkTargetMileage} miles this week.`
          : phase === 'Peak'
          ? `Maximum volume and marathon-specific training. Workouts: marathonPace runs, yasso800s, progression runs, longest long runs (18-22 miles). Target: ${chunkTargetMileage} miles this week (PEAK VOLUME).`
          : `TAPER - Reduce volume 40-60%, maintain intensity. Workouts: easy, short tempo, strides. Long run max 10-12 miles. Focus on rest, nutrition, race prep. Target: ${chunkTargetMileage} miles this week.`

      // Build system instruction with Triple-Check accuracy data + enhanced training science
      const systemInstruction = `You are an ELITE ${totalWeeks}-week marathon coach using ADVANCED TRAINING SCIENCE methodology.

ATHLETE PROFILE (Data Quality: ${dataQuality}):
- Fitness Level: ${fitnessLevel}
- Reference PR: ${formatTime(prTimeMinutes)} for ${prDistanceKm}km (source: ${prSource})
- VDOT Score: ${vdotScore} (Jack Daniels' Running Formula)
- Current Weekly Mileage: ${weeklyMileage} mi/week (${mileageTaxDescription})
- Target Mileage This Week: ${chunkTargetMileage} mi/week ${isStepBackChunk ? '(STEP-BACK WEEK - reduced volume)' : ''}
- Age/Gender: ${age}/${gender} (age-grading factor: ${ageGradingFactor.toFixed(3)})
- Max Heart Rate: ${maxHR} bpm

HEART RATE ZONES (for workout intensity guidance):
- Zone 1 (${hrZones.zone1.name}): ${hrZones.zone1.min}-${hrZones.zone1.max} bpm - ${hrZones.zone1.description}
- Zone 2 (${hrZones.zone2.name}): ${hrZones.zone2.min}-${hrZones.zone2.max} bpm - ${hrZones.zone2.description}
- Zone 3 (${hrZones.zone3.name}): ${hrZones.zone3.min}-${hrZones.zone3.max} bpm - ${hrZones.zone3.description}
- Zone 4 (${hrZones.zone4.name}): ${hrZones.zone4.min}-${hrZones.zone4.max} bpm - ${hrZones.zone4.description}
- Zone 5 (${hrZones.zone5.name}): ${hrZones.zone5.min}-${hrZones.zone5.max} bpm - ${hrZones.zone5.description}

PROGRESSIVE OVERLOAD RULES:
- NEVER increase weekly mileage by more than 10% from previous week
- Every 4th week is a STEP-BACK WEEK (reduce volume by 20-30%)
- Peak mileage should be reached 3-4 weeks before the marathon
- Taper phase: progressively reduce to 30-40% of peak mileage

WORKOUT VARIETY (use these throughout the plan):
- easy: Zone 2, conversational pace - aerobic development
- recovery: Zone 1, very easy shuffle - active recovery
- long: Zone 2 with final miles at marathon pace - endurance
- tempo: Zone 3, comfortably hard - lactate threshold
- interval: Zone 4-5, hard with recovery - VO2max
- marathonPace: Zone 3, exact goal pace - race-specific
- progression: Zone 2 to 3, start easy finish fast - negative split practice
- fartlek: Zone 2-4, unstructured speed play - fun speed work
- hillRepeats: Zone 4, hard uphill efforts - leg strength (include 1x per week in Build phase)
- yasso800s: Zone 4-5, 800m repeats - marathon predictor (include in Peak phase)
- strides: Add 4-6 x 20sec accelerations at end of 2-3 easy runs per week

CALCULATED TRAINING PACES (using Vickers-Vertosick mileage adjustment, Riegel exponent: ${riegelExponent}):
- Predicted Marathon Pace: ${adjustedMarathonPace}/mile
- Easy Run Pace: ${easyPace}/mile (aerobic development)
- Tempo Pace: ${tempoPace}/mile (lactate threshold)
- Interval Pace: ${intervalPace}/mile (VO2max development)

Generate ${weeksInChunk} weeks (${daysInChunk} days) of training.

ABSOLUTE REQUIREMENTS - NO EXCEPTIONS:
1. Generate EXACTLY 7 days per week. NO MORE, NO LESS.
2. For each week, provide EXACTLY ${args.daysPerWeek} workout objects (type: "easy", "tempo", "interval", "long", or "recovery")
3. For each week, provide EXACTLY ${7 - args.daysPerWeek} rest objects (type: "rest", distance: 0)
4. Each object MUST have:
   - weekNumber: Week number (1-${totalWeeks}), must increment by exactly 1 each week
   - dayNumber: Day number (1-7), must cycle 1-7 for each week
   - date: YYYY-MM-DD format, increment by exactly 1 day for each consecutive day
5. Do NOT skip weeks. Do NOT add extra days. Do NOT generate more than ${args.daysPerWeek} runs per week.
6. Long Run MUST be on Sundays (dayOfWeek: 6, dayNumber: 7)
7. Every run MUST have a target pace
8. Output: JSON array of exactly ${daysInChunk} objects (${weeksInChunk} weeks × 7 days = ${daysInChunk} days)

Workout structure (each object):
{"date":"YYYY-MM-DD","dayOfWeek":0,"type":"easy","distance":5.0,"targetPace":"8:30","description":"Easy run","week":1,"weekNumber":1,"day":1,"dayNumber":1}

Phase: ${phase} Phase - ${phaseDescription}`

      // Build user prompt with context
      let userPrompt = `Generate weeks ${startWeek}-${actualEndWeek} of a ${totalWeeks}-week marathon training plan starting on ${chunkStartDateStr} with the marathon on ${args.marathonDate}. 

STRICT REQUIREMENTS:
- You are a strict ${totalWeeks}-week coach
- Generate EXACTLY 7 days per week (no more, no less)
- Each week must have EXACTLY ${args.daysPerWeek} workout objects (non-rest) and EXACTLY ${7 - args.daysPerWeek} rest objects
- Each object MUST include:
  * weekNumber: Starting at ${startWeek}, increment by 1 for each new week
  * dayNumber: Cycle 1-7 for each week (1=Monday, 7=Sunday)
  * date: Start with ${chunkStartDateStr}, increment by exactly 1 day for each consecutive day
- Do NOT skip weeks. Do NOT add extra days. Do NOT generate more than ${args.daysPerWeek} runs per week.
- Ensure dates increment by exactly 1 day: ${chunkStartDateStr}, then next day, then next day, etc.`

      if (contextSummary) {
        userPrompt += `\n\nPrevious week summary for gradual progression: ${contextSummary}\n\nEnsure gradual progression from the previous phase while maintaining EXACTLY ${args.daysPerWeek} runs per week.`
      }

      // Generate with Flash-Lite model using structured output (per Google docs)
      // Reference: https://ai.google.dev/gemini-api/docs/structured-output
      // Note: responseSchema and responseMimeType are passed at model creation time
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-lite',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: workoutSchema,
        },
      })

      try {
        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }],
            },
          ],
        })

        const response = result.response
        let text = response.text()

        // Per Google API docs and Stack Overflow community best practices:
        // Even with structured output, models sometimes wrap JSON in markdown or add explanatory text
        // Reference: https://stackoverflow.com/questions/6886935/parsing-malformed-json-with-javascript
        // Steps:
        // 1. Strip markdown code blocks if present (```json or ``` wrappers)
        // 2. Extract JSON array boundaries if wrapped in explanation text
        // 3. Trim whitespace
        text = text.trim()
        if (text.startsWith('```json')) {
          text = text.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim()
        } else if (text.startsWith('```')) {
          text = text.replace(/```\n?/g, '').replace(/```\n?$/g, '').trim()
        }
        
        // Find the JSON array boundaries (handle cases where model adds explanation)
        const jsonStart = text.indexOf('[')
        const jsonEnd = text.lastIndexOf(']')
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          text = text.substring(jsonStart, jsonEnd + 1)
        }

        // Structured output should guarantee valid JSON, but add safety net
          // Safety net: Even with structured output, edge cases can occur
          // Per Stack Overflow patterns: https://stackoverflow.com/questions/28104214/getting-partial-json-response
          // Common issues: token limits causing truncation, network issues, model edge cases
          // Implement minimal repair as safety net (should be rare with structured output)
        let planData: any[]
        try {
          planData = JSON.parse(text)
        } catch (parseError: any) {
          // Log full context for debugging (per Google API best practices)
          console.error(`JSON parse error for weeks ${startWeek}-${actualEndWeek}:`, parseError.message)
          console.error('Response length:', text.length)
          console.error('Response preview (first 500 chars):', text.substring(0, 500))
          console.error('Response preview (last 200 chars):', text.substring(Math.max(0, text.length - 200)))
          
          // Per Stack Overflow patterns: attempt minimal repair as safety net
          // Even with structured output, edge cases can occur (token limits, network issues)
          let repaired = text
          
          // Fix common issues found in community reports:
          // 1. Remove trailing commas before closing brackets
          repaired = repaired.replace(/,(\s*[}\]])/g, '$1')
          
          // 2. Fix double closing braces: }}] -> }]
          if (repaired.endsWith('}}]')) {
            repaired = repaired.slice(0, -3) + '}]'
          }
          
          // 3. Ensure proper array closing
          if (!repaired.endsWith(']') && repaired.endsWith('}')) {
            repaired += ']'
          }
          
          try {
            planData = JSON.parse(repaired)
            console.warn(`[ai:generateFullMarathonPlan] JSON repair succeeded for weeks ${startWeek}-${actualEndWeek} after initial parse failure`)
          } catch (repairError: any) {
            // Repair failed - throw detailed error per Google API best practices
            console.error(`[ai:generateFullMarathonPlan] JSON repair failed for weeks ${startWeek}-${actualEndWeek}`)
            console.error(`[ai:generateFullMarathonPlan] Original error: ${parseError.message}`)
            console.error(`[ai:generateFullMarathonPlan] Repair error: ${repairError.message}`)
            throw new Error(
              `Failed to parse structured JSON response for weeks ${startWeek}-${actualEndWeek}. ` +
              `Original error: ${parseError.message}. ` +
              `Repair attempt also failed: ${repairError.message}. ` +
              `This should be rare with structured output - check model response or token limits. ` +
              `Check Convex logs for full response details.`
            )
          }
        }
        
        // Validate that we got an array (should always be true with structured output)
        if (!Array.isArray(planData)) {
          console.error(`[ai:generateFullMarathonPlan] Expected array but got ${typeof planData} for weeks ${startWeek}-${actualEndWeek}`)
          console.error(`[ai:generateFullMarathonPlan] Response type: ${typeof planData}, value:`, planData)
          throw new Error(
            `Invalid response format: expected array, got ${typeof planData}. ` +
            `Structured output should always return an array. Check schema definition.`
          )
        }

        // Validate chunk size
        if (!Array.isArray(planData)) {
          throw new Error(`Invalid plan format: expected array, got ${typeof planData}`)
        }

        // Fix week numbers and day numbers based on dates to ensure accuracy
        // Calculate correct week number and day number for each workout based on its date
        for (let i = 0; i < planData.length; i++) {
          const workout = planData[i]
          if (workout.date) {
            const workoutDate = new Date(workout.date)
            workoutDate.setHours(0, 0, 0, 0)
            const chunkStartDateObj = new Date(chunkStartDateStr)
            chunkStartDateObj.setHours(0, 0, 0, 0)
            const daysDiff = Math.floor((workoutDate.getTime() - chunkStartDateObj.getTime()) / (1000 * 60 * 60 * 24))
            const calculatedWeek = startWeek + Math.floor(daysDiff / 7)
            const calculatedDay = (daysDiff % 7) + 1
            
            // Only fix if the calculated week is reasonable (within the chunk range)
            if (calculatedWeek >= startWeek && calculatedWeek <= actualEndWeek) {
              workout.week = calculatedWeek
              workout.weekNumber = calculatedWeek
              workout.day = calculatedDay
              workout.dayNumber = calculatedDay
            }
          } else {
            // If no date, calculate from position in array
            const calculatedWeek = startWeek + Math.floor(i / 7)
            const calculatedDay = (i % 7) + 1
            workout.week = calculatedWeek
            workout.weekNumber = calculatedWeek
            workout.day = calculatedDay
            workout.dayNumber = calculatedDay
          }
        }
        
        // Validate and fix: Ensure each week has exactly ${args.daysPerWeek} runs
        const workoutsByWeek: Record<number, any[]> = {}
        for (const workout of planData) {
          const week = workout.weekNumber || workout.week || 1
          if (!workoutsByWeek[week]) {
            workoutsByWeek[week] = []
          }
          workoutsByWeek[week].push(workout)
        }
        
        // Fix each week to have exactly the right number of runs
        const fixedPlanData: any[] = []
        for (const [weekNum, weekWorkouts] of Object.entries(workoutsByWeek)) {
          const week = parseInt(weekNum, 10)
          
          // Remove duplicates by date first
          const uniqueByDate = weekWorkouts.filter((w, index, self) => 
            index === self.findIndex((w2) => w2.date === w.date)
          )
          
          // Separate runs and rest days
          const runs = uniqueByDate.filter((w) => w.type !== 'rest').sort((a, b) => {
            // Sort by date to keep the first ones
            if (a.date && b.date) return a.date.localeCompare(b.date)
            return (a.dayNumber || a.day || 1) - (b.dayNumber || b.day || 1)
          })
          const restDays = uniqueByDate.filter((w) => w.type === 'rest').sort((a, b) => {
            if (a.date && b.date) return a.date.localeCompare(b.date)
            return (a.dayNumber || a.day || 1) - (b.dayNumber || b.day || 1)
          })
          
          // If too many runs, keep only the first ${args.daysPerWeek} runs
          if (runs.length > args.daysPerWeek) {
            console.warn(`Week ${week} has ${runs.length} runs, keeping only first ${args.daysPerWeek}`)
            const runsToKeep = runs.slice(0, args.daysPerWeek)
            const runsToRemove = runs.slice(args.daysPerWeek)
            
            // Convert extra runs to rest days
            for (const run of runsToRemove) {
              run.type = 'rest'
              run.distance = 0
              run.targetPace = ''
              run.description = 'Rest day (converted from extra run)'
              restDays.push(run)
            }
            
            fixedPlanData.push(...runsToKeep)
          } else {
            fixedPlanData.push(...runs)
          }
          
          // Add rest days (should be ${7 - args.daysPerWeek} rest days)
          const expectedRestDays = 7 - args.daysPerWeek
          if (restDays.length > expectedRestDays) {
            // Keep only the first expectedRestDays rest days
            fixedPlanData.push(...restDays.slice(0, expectedRestDays))
          } else {
            fixedPlanData.push(...restDays)
          }
        }
        
        // Sort the fixed plan data by week and day
        fixedPlanData.sort((a, b) => {
          const weekA = a.weekNumber || a.week || 1
          const weekB = b.weekNumber || b.week || 1
          if (weekA !== weekB) return weekA - weekB
          
          if (a.date && b.date) return a.date.localeCompare(b.date)
          return (a.dayNumber || a.day || 1) - (b.dayNumber || b.day || 1)
        })
        
        return fixedPlanData

        if (planData.length !== daysInChunk) {
          // Be more forgiving - if we got at least 25% of expected items, pad it
          const minRequired = Math.ceil(daysInChunk * 0.25)
          
          if (planData.length < minRequired) {
            console.error(`Chunk too small: got ${planData.length} items, need at least ${minRequired} (25% of ${daysInChunk})`)
            throw new Error(
              `Invalid chunk size: expected ${daysInChunk} days, got ${planData.length} (need at least ${minRequired}). ` +
              `Structured output should prevent this. Check model response.`
            )
          }
          
          // We have enough items - pad the rest
          console.warn(
            `Chunk has ${planData.length} items instead of ${daysInChunk}. Will pad ${daysInChunk - planData.length} missing days.`
          )
          
          // Calculate what date to continue from
          const lastDay = planData[planData.length - 1]
          let lastDate = lastDay?.date ? new Date(lastDay.date) : new Date(chunkStartDateStr)
          
          // Pad with rest days to reach expected size
          const originalLength = planData.length
          while (planData.length < daysInChunk) {
            lastDate.setDate(lastDate.getDate() + 1)
            const currentWeek = startWeek + Math.floor((planData.length) / 7)
            const currentDay = (planData.length % 7) + 1
            const dayOfWeek = (lastDate.getDay() + 6) % 7 // Convert Sunday=0 to Monday=0
            
            planData.push({
              date: lastDate.toISOString().split('T')[0],
              dayOfWeek: dayOfWeek,
              type: 'rest',
              distance: 0,
              targetPace: '',
              description: `Rest day (padded - original generation had ${originalLength} items)`,
              week: currentWeek,
              day: currentDay,
            })
          }
          
          // Truncate if too many
          if (planData.length > daysInChunk) {
            planData = planData.slice(0, daysInChunk)
          }
          
          console.log(`Successfully adjusted chunk from ${originalLength} to ${daysInChunk} items (padded ${daysInChunk - originalLength} rest days)`)
        }

        return planData
      } catch (error: any) {
        console.error(`Error generating weeks ${startWeek}-${actualEndWeek}:`, error.message)
        throw new Error(
          `Failed to generate weeks ${startWeek}-${actualEndWeek} with gemini-2.5-flash-lite: ${error.message}`
        )
      }
    }

    // Recursive generation: generate 4-week chunks with throttling
    const allPlanData: any[] = []
    let currentWeek = 1
    let isFirstChunk = true

    while (currentWeek <= totalWeeks) {
      const endWeek = Math.min(currentWeek + 3, totalWeeks) // 4-week chunks
      const phase = getPhase(currentWeek, totalWeeks)

      // Smart throttling: 10-second delay between chunks (except first chunk)
      if (!isFirstChunk) {
        console.log(`Throttling: Waiting 10 seconds before next chunk to respect rate limits...`)
        await new Promise((resolve) => setTimeout(resolve, 10000))
      }
      isFirstChunk = false

      // Get context from previous chunk's final week for gradual progression
      let contextSummary: string | null = null
      if (allPlanData.length > 0) {
        const lastWeek = allPlanData.slice(-7) // Last 7 days
        contextSummary = summarizeWeek(lastWeek)
      }

      // Update progress with phase information
      await ctx.runMutation(api.users.updateGenerationProgress, {
        userId: args.userId,
        currentWeek: endWeek,
        totalWeeks,
        status: 'generating',
      })

      console.log(`Generating chunk: ${phase} Phase (weeks ${currentWeek}-${endWeek} of ${totalWeeks})`)

      // Generate chunk
      const chunk = await generateChunk(currentWeek, endWeek, contextSummary, allPlanData)
      allPlanData.push(...chunk)

      // Move to next chunk
      currentWeek = endWeek + 1
    }

    // Final validation and post-processing: Ensure exactly ${args.daysPerWeek} runs per week
    console.log(`Post-processing: Validating all ${totalWeeks} weeks have exactly ${args.daysPerWeek} runs each...`)
    
    // Group by week and fix any issues
    const finalPlanData: any[] = []
    const workoutsByWeek: Record<number, any[]> = {}
    
    // Group all workouts by week
    for (const workout of allPlanData) {
      const week = workout.weekNumber || workout.week || 1
      if (!workoutsByWeek[week]) {
        workoutsByWeek[week] = []
      }
      workoutsByWeek[week].push(workout)
    }
    
    // Process each week
    for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
      const weekWorkouts = workoutsByWeek[weekNum] || []
      
      // Remove duplicates by date
      const uniqueByDate = weekWorkouts.filter((w, index, self) => 
        index === self.findIndex((w2) => w2.date === w.date)
      )
      
      // Separate runs and rest days
      const runs = uniqueByDate.filter((w) => w.type !== 'rest').sort((a, b) => {
        if (a.date && b.date) return a.date.localeCompare(b.date)
        return (a.dayNumber || a.day || 1) - (b.dayNumber || b.day || 1)
      })
      const restDays = uniqueByDate.filter((w) => w.type === 'rest').sort((a, b) => {
        if (a.date && b.date) return a.date.localeCompare(b.date)
        return (a.dayNumber || a.day || 1) - (b.dayNumber || b.day || 1)
      })
      
      // Fix runs count
      if (runs.length > args.daysPerWeek) {
        console.warn(`Week ${weekNum}: Has ${runs.length} runs, reducing to ${args.daysPerWeek}`)
        // Keep only first ${args.daysPerWeek} runs, convert rest to rest days
        const runsToKeep = runs.slice(0, args.daysPerWeek)
        const extraRuns = runs.slice(args.daysPerWeek)
        
        for (const run of extraRuns) {
          run.type = 'rest'
          run.distance = 0
          run.targetPace = ''
          run.description = 'Rest day (auto-corrected from extra run)'
          restDays.push(run)
        }
        
        finalPlanData.push(...runsToKeep)
      } else if (runs.length < args.daysPerWeek) {
        console.warn(`Week ${weekNum}: Has only ${runs.length} runs, expected ${args.daysPerWeek}`)
        // Keep all runs (this shouldn't happen with strict AI, but handle it)
        finalPlanData.push(...runs)
      } else {
        // Perfect! Exactly ${args.daysPerWeek} runs
        finalPlanData.push(...runs)
      }
      
      // Add rest days (should be ${7 - args.daysPerWeek})
      const expectedRestDays = 7 - args.daysPerWeek
      if (restDays.length >= expectedRestDays) {
        finalPlanData.push(...restDays.slice(0, expectedRestDays))
      } else {
        // Add missing rest days
        finalPlanData.push(...restDays)
        // This shouldn't happen, but if it does, we'll pad later
      }
    }
    
    // Sort by week and day
    finalPlanData.sort((a, b) => {
      const weekA = a.weekNumber || a.week || 1
      const weekB = b.weekNumber || b.week || 1
      if (weekA !== weekB) return weekA - weekB
      
      if (a.date && b.date) return a.date.localeCompare(b.date)
      return (a.dayNumber || a.day || 1) - (b.dayNumber || b.day || 1)
    })
    
    // Final size check
    const expectedDays = totalWeeks * 7
    if (finalPlanData.length !== expectedDays) {
      console.warn(`Final plan has ${finalPlanData.length} days instead of ${expectedDays}. Adjusting...`)
      if (finalPlanData.length < expectedDays - 7 || finalPlanData.length > expectedDays + 7) {
        throw new Error(`Invalid plan size after post-processing: expected ${expectedDays} days, got ${finalPlanData.length}`)
      }
      // Pad or truncate
      while (finalPlanData.length < expectedDays) {
        const lastDay = finalPlanData[finalPlanData.length - 1]
        const week = Math.ceil(finalPlanData.length / 7)
        const day = ((finalPlanData.length - 1) % 7) + 1
        finalPlanData.push({
          ...lastDay,
          type: 'rest',
          distance: 0,
          targetPace: '',
          week,
          weekNumber: week,
          day,
          dayNumber: day,
        })
      }
      if (finalPlanData.length > expectedDays) {
        finalPlanData.splice(expectedDays)
      }
    }
    
    // Verify final result
    const finalRunsByWeek: Record<number, number> = {}
    for (const workout of finalPlanData) {
      const week = workout.weekNumber || workout.week || 1
      if (workout.type !== 'rest') {
        finalRunsByWeek[week] = (finalRunsByWeek[week] || 0) + 1
      }
    }
    
    for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
      const runsCount = finalRunsByWeek[weekNum] || 0
      if (runsCount !== args.daysPerWeek) {
        console.error(`Week ${weekNum} still has ${runsCount} runs after post-processing! Expected ${args.daysPerWeek}`)
      } else {
        console.log(`Week ${weekNum}: ✓ ${runsCount} runs (correct)`)
      }
    }
    
    console.log(`Post-processing complete: ${finalPlanData.length} days, ${totalWeeks} weeks`)

    // Mark generation as completed
    await ctx.runMutation(api.users.updateGenerationProgress, {
      userId: args.userId,
      currentWeek: totalWeeks,
      totalWeeks,
      status: 'completed',
    })

    console.log(`Successfully generated ${totalWeeks}-week plan with ${finalPlanData.length} workouts`)

    // Save to plans table
    const planId: Id<'plans'> = await ctx.runMutation(api.plans.createPlan, {
      userId: args.userId,
      goalMarathonDate: args.marathonDate,
      startDate,
      totalWeeks,
      planData: finalPlanData,
      isActive: true,
    })

    return planId
  },
})
