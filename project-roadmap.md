# AI Marathon Training Application - Project Roadmap

## Project Overview

**Project Name:** FreeRunna (AI-Powered Marathon Training Coach)

**Goal:** Build a world-class adaptive marathon training application that generates personalized 16-18 week training plans and adjusts them in real-time based on wearable device data (Garmin runs and Whoop recovery metrics).

**Core Value Proposition:** Unlike static training plans, FreeRunna uses AI to continuously adapt training based on actual performance data and recovery metrics, ensuring optimal preparation while minimizing injury risk.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 16.1.3 (App Router)
- **Styling:** Tailwind CSS 4.x
- **UI Components:** Shadcn UI (built on Radix UI)
- **Icons:** Lucide React
- **State Management:** React Server Components + Convex React hooks
- **Fonts:** Geist Sans & Geist Mono (already configured)

### Backend & Database
- **Backend:** Convex (real-time database + serverless functions)
- **Authentication:** Clerk (already integrated)
- **File Storage:** Convex File Storage (for plan exports, etc.)

### External Integrations
- **Wearable Data:** Terra API (bridges Garmin and Whoop)
- **AI Engine:** Google Gemini 1.5 Pro/Flash (via Google AI SDK)
- **Webhooks:** Next.js API routes for Terra webhook ingestion

### Development Tools
- **Language:** TypeScript
- **Package Manager:** npm
- **Linting:** ESLint with Next.js config

---

## Architecture Overview

### System Flow

```
User Onboarding → Plan Generation (AI) → Dashboard View → Wearable Sync → Adaptive Adjustments
```

### Data Flow

1. **User Input:** Onboarding captures 5k PB, goal date, weekly availability
2. **AI Generation:** Gemini creates structured JSON training plan (16-18 weeks)
3. **Plan Storage:** Plan stored in Convex with daily workout breakdown
4. **Wearable Ingestion:** Terra webhooks push Garmin runs and Whoop recovery
5. **Adaptive Logic:** AI analyzes deviations and auto-adjusts next 3 days
6. **Real-time Updates:** Convex subscriptions update dashboard instantly

### Component Architecture

```
app/
├── (auth)/                    # Auth-protected routes
│   ├── onboarding/           # Multi-step onboarding flow
│   ├── dashboard/            # Main training dashboard
│   ├── plan/                 # Full plan view
│   └── settings/             # User preferences
├── api/
│   └── webhooks/
│       └── terra/            # Terra webhook handler
└── layout.tsx                # Root layout with providers

convex/
├── users.ts                  # User profile & onboarding data
├── plans.ts                  # Training plan CRUD operations
├── workouts.ts               # Daily workout tracking
├── wearable.ts               # Wearable data ingestion
├── ai/
│   ├── generator.ts          # Plan generation with Gemini
│   └── adapter.ts            # Adaptive plan adjustments
└── schema.ts                 # Convex schema definitions
```

---

## Core Features

### 1. Onboarding Flow

**Purpose:** Capture essential user data to generate personalized training plan

**Steps:**
1. **Welcome Screen:** Brief intro to adaptive training
2. **5K Personal Best:** Input current 5K time (used to calculate training paces)
3. **Goal Marathon Date:** Select target race date (validates 16-18 week window)
4. **Weekly Availability:** 
   - Days per week available (4-7 days)
   - Preferred long run day
   - Time constraints per day
5. **Experience Level:** Beginner / Intermediate / Advanced
6. **Review & Confirm:** Summary before plan generation

**Data Model:**
```typescript
interface OnboardingData {
  userId: string;              // Clerk user ID
  fiveKPB: number;             // Minutes (e.g., 22.5)
  goalMarathonDate: string;    // ISO date string
  weeklyAvailability: {
    daysPerWeek: number;       // 4-7
    longRunDay: 'saturday' | 'sunday';
    timePerDay: number;        // Minutes available per day
  };
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  createdAt: number;           // Timestamp
}
```

**UI Components:**
- Multi-step form with progress indicator
- Date picker for marathon selection
- Day selector for weekly schedule
- Validation for minimum 16 weeks until race

---

### 2. AI Training Plan Generator

**Purpose:** Generate comprehensive 16-18 week training plan using Gemini AI

**Plan Structure:**
- **Base Phase (Weeks 1-6):** Build aerobic base, establish routine
- **Build Phase (Weeks 7-12):** Increase volume, add tempo runs
- **Peak Phase (Weeks 13-16):** Highest volume, race-specific workouts
- **Taper Phase (Weeks 17-18):** Reduce volume, maintain intensity, race prep

**Workout Types:**
- Easy runs (aerobic base)
- Tempo runs (lactate threshold)
- Intervals (VO2 max)
- Long runs (endurance)
- Recovery runs
- Rest days

**AI Prompt Strategy:**
- System prompt with training principles (80/20 rule, periodization)
- User context: 5K PB, goal date, availability, experience
- Output: Structured JSON matching `TrainingPlan` schema

**Plan JSON Schema:**
```typescript
interface TrainingPlan {
  id: string;
  userId: string;
  goalMarathonDate: string;
  startDate: string;
  totalWeeks: number;
  phases: {
    name: 'base' | 'build' | 'peak' | 'taper';
    startWeek: number;
    endWeek: number;
    weeklyMileage: number[];
  }[];
  weeks: Week[];
  generatedAt: number;
  lastAdjustedAt: number;
}

interface Week {
  weekNumber: number;
  phase: 'base' | 'build' | 'peak' | 'taper';
  totalMileage: number;
  days: Day[];
}

interface Day {
  date: string;               // ISO date
  dayOfWeek: number;          // 0-6
  workout: Workout | null;    // null = rest day
}

interface Workout {
  type: 'easy' | 'tempo' | 'intervals' | 'long' | 'recovery';
  distance: number;           // Miles
  duration: number;           // Minutes (estimated)
  pace: {
    min: string;              // "8:30" per mile
    max: string;              // "9:00" per mile
  };
  description: string;        // AI-generated workout details
  intervals?: {               // For interval workouts
    warmup: number;
    repeats: Array<{
      distance: number;
      pace: string;
      rest: number;
    }>;
    cooldown: number;
  };
}
```

**Convex Function:**
- `generatePlan`: Calls Gemini API with user context, returns structured plan
- Stores plan in Convex database
- Handles errors and retries

---

### 3. Dashboard (Mobile-First)

**Purpose:** Primary interface for daily training guidance

**Key Views:**

#### Today's Workout Card
- Large, prominent card showing:
  - Workout type (with icon)
  - Distance/duration
  - Target pace range
  - Workout description
  - "Mark Complete" button
- If rest day: Recovery tips or cross-training suggestions

#### Weekly Progress
- 7-day calendar view
- Color-coded: Completed (green), Missed (red), Upcoming (gray), Rest (blue)
- Weekly mileage progress bar
- Tap day to see workout details

#### Adaptive Indicators
- Badge showing if plan was recently adjusted
- "Plan Updated" notification when AI makes changes
- Recovery score integration (if Whoop connected)

#### Quick Stats
- Current week mileage
- Total plan progress (%)
- Days until marathon
- Streak counter

**Design Principles:**
- Dark mode by default
- High contrast for readability
- Large touch targets (mobile-first)
- Minimal cognitive load
- Premium fitness aesthetic

**Components:**
- `TodayWorkoutCard`
- `WeeklyCalendar`
- `ProgressBar`
- `StatsGrid`
- `AdaptiveBadge`

---

### 4. Wearable Integration (Terra API)

**Purpose:** Ingest real-time data from Garmin and Whoop devices

**Terra API Setup:**
- Register application with Terra
- Configure webhooks for:
  - Garmin: Activity data (runs)
  - Whoop: Recovery scores, sleep data
- Store Terra API credentials in Convex environment variables

**Webhook Endpoint:**
- Route: `/api/webhooks/terra`
- Validates Terra webhook signature
- Processes incoming data
- Stores in Convex database

**Garmin Data Schema:**
```typescript
interface GarminActivity {
  userId: string;
  activityId: string;
  date: string;              // ISO date
  type: 'running';
  distance: number;           // Miles
  duration: number;           // Seconds
  averagePace: string;        // "8:45" per mile
  averageHeartRate?: number;
  calories?: number;
  elevationGain?: number;
  terraWebhookId: string;
  receivedAt: number;
}
```

**Whoop Data Schema:**
```typescript
interface WhoopRecovery {
  userId: string;
  date: string;              // ISO date (previous night's sleep)
  recoveryScore: number;     // 0-100
  sleepScore?: number;
  strainScore?: number;
  restingHeartRate?: number;
  hrv?: number;              // Heart rate variability
  terraWebhookId: string;
  receivedAt: number;
}
```

**Data Matching:**
- Match Garmin activities to planned workouts by date
- Match Whoop recovery to next day's workout
- Store relationships for adaptive logic

**Convex Functions:**
- `ingestGarminActivity`: Store run data, match to workout
- `ingestWhoopRecovery`: Store recovery data
- `getWearableDataForDate`: Query data for specific date

---

### 5. Adaptive Plan Adjustment Logic

**Purpose:** Automatically modify training plan based on actual performance and recovery

**Trigger Conditions:**

1. **Low Recovery Score:**
   - Whoop recovery < 35% → Adjust next 3 days
   - Actions:
     - Convert hard workout to easy/recovery
     - Reduce distance by 20-30%
     - Add extra rest day if needed

2. **Missed Long Run:**
   - Long run not completed → Adjust next 3 days
   - Actions:
     - Reschedule long run to next available day
     - Reduce intensity of intervening days
     - Extend taper if necessary

3. **Pace Deviation:**
   - Actual pace significantly faster/slower than target
   - Actions:
     - Adjust future pace targets
     - Recalibrate training zones

4. **Injury Prevention:**
   - Multiple missed workouts → Suggest rest week
   - Rapid mileage increase → Reduce next week's volume

**AI Adjustment Process:**

1. **Analyze Context:**
   - Current week/day in plan
   - Recent wearable data (last 7 days)
   - Original plan structure
   - User's historical adherence

2. **Generate Adjustment:**
   - Call Gemini with adjustment prompt
   - Include: current plan state, deviation reason, training principles
   - Request: Modified next 3 days with rationale

3. **Apply Changes:**
   - Update Convex database
   - Preserve original plan (version history)
   - Log adjustment reason
   - Notify user via dashboard

**Adjustment Schema:**
```typescript
interface PlanAdjustment {
  id: string;
  planId: string;
  triggeredAt: number;
  reason: 'low_recovery' | 'missed_long_run' | 'pace_deviation' | 'injury_prevention';
  affectedDays: string[];     // ISO dates
  originalDays: Day[];
  adjustedDays: Day[];
  aiRationale: string;        // Why adjustment was made
}
```

**Convex Functions:**
- `checkAdaptiveTriggers`: Scheduled function (runs daily)
- `generateAdjustment`: Calls Gemini for adjustment
- `applyAdjustment`: Updates plan in database
- `getAdjustmentHistory`: Query past adjustments

---

## Data Models (Convex Schema)

### Users Table
```typescript
users: {
  _id: Id<"users">;
  clerkUserId: string;        // Clerk user ID
  email: string;
  onboardingComplete: boolean;
  onboardingData?: OnboardingData;
  terraUserId?: string;       // Terra user ID for webhooks
  createdAt: number;
  updatedAt: number;
}
```

### Plans Table
```typescript
plans: {
  _id: Id<"plans">;
  userId: Id<"users">;
  goalMarathonDate: string;
  startDate: string;
  totalWeeks: number;
  planData: TrainingPlan;     // Full JSON plan
  isActive: boolean;
  adjustments: Id<"adjustments">[];
  createdAt: number;
  lastAdjustedAt: number;
}
```

### Workouts Table
```typescript
workouts: {
  _id: Id<"workouts">;
  planId: Id<"plans">;
  userId: Id<"users">;
  date: string;               // ISO date
  plannedWorkout: Workout;
  actualWorkout?: {
    garminActivityId?: string;
    distance: number;
    duration: number;
    averagePace: string;
    completed: boolean;
  };
  status: 'planned' | 'completed' | 'missed' | 'adjusted';
  completedAt?: number;
}
```

### Wearable Data Tables
```typescript
garminActivities: {
  _id: Id<"garminActivities">;
  userId: Id<"users">;
  activityId: string;
  date: string;
  data: GarminActivity;
  matchedWorkoutId?: Id<"workouts">;
  createdAt: number;
}

whoopRecoveries: {
  _id: Id<"whoopRecoveries">;
  userId: Id<"users">;
  date: string;
  data: WhoopRecovery;
  createdAt: number;
}
```

### Adjustments Table
```typescript
adjustments: {
  _id: Id<"adjustments">;
  planId: Id<"plans">;
  reason: string;
  affectedDays: string[];
  adjustmentData: PlanAdjustment;
  createdAt: number;
}
```

---

## Design System

### Color Palette (Dark Mode)
- **Background:** `#0a0a0a` (near black)
- **Surface:** `#1a1a1a` (dark gray)
- **Primary:** `#00ff88` (vibrant green - Runna/Whoop aesthetic)
- **Secondary:** `#0066ff` (blue accent)
- **Text Primary:** `#ffffff`
- **Text Secondary:** `#a0a0a0`
- **Success:** `#00ff88`
- **Warning:** `#ffaa00`
- **Error:** `#ff4444`

### Typography
- **Headings:** Geist Sans, bold, large sizes
- **Body:** Geist Sans, regular weight
- **Monospace:** Geist Mono (for pace displays, stats)

### Component Patterns
- **Cards:** Rounded corners (12px), subtle border, elevated shadow
- **Buttons:** High contrast, large touch targets (min 44px height)
- **Progress Bars:** Animated, gradient fills
- **Icons:** Lucide React, consistent sizing (20px default)

### Spacing
- Mobile-first: 4px base unit
- Padding: 16px standard, 24px for cards
- Gaps: 8px, 16px, 24px for component spacing

---

## Implementation Phases

### Phase 1: Foundation & Onboarding
**Goal:** Set up core infrastructure and user onboarding

**Tasks:**
1. Install and configure Shadcn UI components
2. Create onboarding flow UI (multi-step form)
3. Implement Convex schema for users and onboarding data
4. Build onboarding data collection and validation
5. Create user profile management

**Deliverables:**
- Complete onboarding flow
- User data stored in Convex
- Basic user dashboard shell

---

### Phase 2: AI Plan Generator
**Goal:** Generate training plans using Gemini AI

**Tasks:**
1. Install Google AI SDK (`@google/generative-ai`)
2. Create Gemini API integration in Convex
3. Design AI prompt system for plan generation
4. Implement plan generation Convex function
5. Create plan storage schema
6. Build plan JSON parser and validator
7. Create plan generation UI (loading states, results)

**Deliverables:**
- Working AI plan generator
- Plans stored in Convex
- Plan view UI (full 16-18 week breakdown)

---

### Phase 3: Dashboard & Today's Workout
**Goal:** Mobile-first dashboard with daily workout view

**Tasks:**
1. Design and implement Today's Workout card
2. Build weekly calendar component
3. Create progress tracking (mileage, completion)
4. Implement workout completion flow
5. Add stats grid (streak, progress, countdown)
6. Create plan overview page

**Deliverables:**
- Functional dashboard
- Workout completion tracking
- Progress visualization

---

### Phase 4: Wearable Integration
**Goal:** Ingest Garmin and Whoop data via Terra API

**Tasks:**
1. Set up Terra API account and webhook configuration
2. Create Terra webhook endpoint (`/api/webhooks/terra`)
3. Implement webhook signature validation
4. Create Garmin activity ingestion logic
5. Create Whoop recovery ingestion logic
6. Build data matching (activities to workouts)
7. Create wearable data display in dashboard
8. Add Terra connection UI (OAuth flow if needed)

**Deliverables:**
- Terra webhook receiving data
- Garmin runs stored and matched to workouts
- Whoop recovery scores stored
- Wearable data visible in dashboard

---

### Phase 5: Adaptive Logic
**Goal:** AI-powered plan adjustments based on data

**Tasks:**
1. Implement trigger detection logic
2. Create adjustment prompt system for Gemini
3. Build adjustment generation Convex function
4. Implement plan modification logic
5. Create adjustment history tracking
6. Build user notifications for adjustments
7. Add adjustment rationale display
8. Test various adjustment scenarios

**Deliverables:**
- Automatic plan adjustments working
- User notified of changes
- Adjustment history viewable
- Plan heals from missed workouts/low recovery

---

### Phase 6: Polish & Optimization
**Goal:** Refine UX, performance, and edge cases

**Tasks:**
1. Optimize AI prompt engineering (reduce latency, improve quality)
2. Add error handling and retry logic
3. Implement loading states and skeletons
4. Add empty states and onboarding help
5. Optimize mobile performance
6. Add analytics tracking
7. Create export functionality (PDF plan export)
8. Add sharing features (optional)

**Deliverables:**
- Polished, production-ready application
- Fast load times
- Excellent mobile UX
- Comprehensive error handling

---

## Environment Variables

### Required Environment Variables

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Convex
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOY_KEY=

# Google AI (Gemini)
GOOGLE_AI_API_KEY=

# Terra API
TERRA_API_KEY=
TERRA_WEBHOOK_SECRET=

# App Configuration
NEXT_PUBLIC_APP_URL=  # For webhook URLs
```

---

## API Integration Details

### Google Gemini AI

**Package:** `@google/generative-ai`

**Usage:**
- Model: `gemini-1.5-pro` (for plan generation)
- Model: `gemini-1.5-flash` (for quick adjustments)
- Temperature: 0.7 (creative but consistent)
- Max tokens: 4000 (for full plan JSON)

**Convex Function Pattern:**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

export const generatePlan = mutation({
  args: { onboardingData: v.any() },
  handler: async (ctx, args) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
    const prompt = buildPlanPrompt(args.onboardingData)
    const result = await model.generateContent(prompt)
    // Parse and validate JSON response
    // Store in Convex
  }
})
```

### Terra API

**Webhook Configuration:**
- Endpoint: `https://yourdomain.com/api/webhooks/terra`
- Events: `activity`, `daily`, `sleep`, `body`
- Authentication: Webhook secret validation

**Webhook Handler:**
```typescript
// app/api/webhooks/terra/route.ts
export async function POST(req: Request) {
  // Validate signature
  // Parse Terra webhook payload
  // Call Convex function to ingest data
  // Return 200 OK
}
```

---

## Testing Strategy

### Unit Tests
- AI prompt generation
- Plan adjustment logic
- Data validation functions
- Pace calculations

### Integration Tests
- Terra webhook ingestion
- Gemini API calls
- Convex function execution
- Data matching (activities to workouts)

### E2E Tests (Future)
- Complete onboarding flow
- Plan generation and display
- Workout completion
- Adaptive adjustment flow

---

## Security Considerations

1. **Authentication:** Clerk handles all auth (already integrated)
2. **API Keys:** Store in Convex environment variables (never expose to client)
3. **Webhook Security:** Validate Terra webhook signatures
4. **Data Privacy:** User data isolated by Clerk user ID
5. **Rate Limiting:** Implement for Gemini API calls (prevent abuse)

---

## Performance Targets

- **Dashboard Load:** < 1 second
- **Plan Generation:** < 10 seconds (AI call)
- **Adjustment Generation:** < 5 seconds
- **Webhook Processing:** < 500ms
- **Mobile Optimization:** Lighthouse score > 90

---

## Future Enhancements (Post-MVP)

1. **Social Features:** Share plans, compare progress
2. **Advanced Analytics:** Pace trends, fitness progression charts
3. **Multiple Plans:** Support for multiple concurrent training plans
4. **Custom Workouts:** User-created workout library
5. **Coach Chat:** AI chat interface for training questions
6. **Race Predictor:** Estimate finish time based on training data
7. **Injury Prevention:** ML-based risk scoring
8. **Export Options:** PDF, CSV, Garmin Connect sync

---

## Success Metrics

1. **User Engagement:**
   - Daily active users
   - Workout completion rate
   - Plan adherence percentage

2. **AI Performance:**
   - Plan generation success rate
   - Adjustment accuracy (user satisfaction)
   - Response time

3. **Wearable Integration:**
   - Data ingestion success rate
   - Activity matching accuracy
   - Recovery score utilization

---

## Notes & Considerations

- **Plan Versioning:** Keep original plan + adjustment history for audit trail
- **Offline Support:** Consider caching plan data for offline viewing
- **Error Recovery:** Graceful degradation if Terra/Gemini APIs are down
- **Scalability:** Convex handles scaling automatically, but monitor function execution times
- **Cost Management:** Monitor Gemini API usage (pro/flash model selection)
- **User Onboarding:** First-time user experience is critical for adoption

---

## Getting Started Checklist

- [x] Next.js project initialized
- [x] Clerk authentication integrated
- [x] Convex backend configured
- [x] Tailwind CSS set up
- [ ] Shadcn UI components installed
- [ ] Google AI SDK installed
- [ ] Terra API account created
- [ ] Environment variables configured
- [ ] Project roadmap documented (this file)

---

**Last Updated:** [Current Date]
**Status:** Planning Phase - Ready for Implementation
