'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useAction, useMutation, Authenticated, Unauthenticated } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { SignInButton, UserButton } from '@clerk/nextjs'
import { 
  Activity, 
  Settings2, 
  X, 
  ChevronRight, 
  ChevronDown,
  Loader2,
  Calendar,
  Sparkles,
  Play,
  Link as LinkIcon,
  Zap,
  AlertTriangle,
  User,
  Timer,
  TrendingUp,
  Target,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { FullPageLoading, HeroCardSkeleton, TimelineSkeleton } from '@/components/LoadingState'

export default function DashboardPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold">Dashboard Error</h1>
            <p className="text-gray-400 text-sm">
              Something went wrong loading your dashboard. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#00ff88] text-black rounded-xl font-bold hover:bg-[#00e677] transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      <Authenticated>
        <DashboardContent />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Sign in to continue</h1>
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-[#00ff88] text-black rounded-xl font-bold hover:bg-[#00e677] transition-colors">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
    </ErrorBoundary>
  )
}

// Type guard to check if user needs creation
function isValidUser(user: any): user is { _id: any; [key: string]: any } {
  return user && '_id' in user && !('needsCreation' in user)
}

function DashboardContent() {
  const router = useRouter()
  const currentUser = useQuery(api.users.getCurrentUser)
  
  // Only query plans if we have a valid user (not a "needs creation" object)
  const hasValidUser = isValidUser(currentUser)
  const activePlan = useQuery(
    api.plans.getActivePlan,
    hasValidUser ? { userId: currentUser._id } : 'skip'
  )
  const planByWeek = useQuery(
    api.plans.getPlanByWeek,
    hasValidUser ? { userId: currentUser._id } : 'skip'
  )
  const generatePlan = useAction(api.ai.generateFullMarathonPlan)
  const updateConnections = useMutation(api.users.updateConnections)
  const updateManualStats = useMutation(api.users.updateManualStats)
  const clearWorkouts = useMutation(api.workouts.clearAllWorkouts)

  // State
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'connections' | 'manual'>('connections')
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [marathonDate, setMarathonDate] = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState<3 | 4 | 5 | 6>(4)
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null)
  const [heroWorkout, setHeroWorkout] = useState<any | null>(null)
  
  // Settings form state - Connections
  const [stravaLink, setStravaLink] = useState('')
  const [terraApiKey, setTerraApiKey] = useState('')
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // Settings form state - Manual Stats
  const [age, setAge] = useState<string>('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [weeklyMileage, setWeeklyMileage] = useState<string>('')
  const [fiveKPR, setFiveKPR] = useState('')
  const [tenKPR, setTenKPR] = useState('')
  const [halfMarathonPR, setHalfMarathonPR] = useState('')
  const [isSavingManual, setIsSavingManual] = useState(false)
  
  // Reset plan state
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Initialize form values from user data (only if valid user)
  useEffect(() => {
    if (hasValidUser) {
      setStravaLink(currentUser.stravaLink || '')
      setTerraApiKey(currentUser.terraApiKey || '')
      setAge(currentUser.age?.toString() || '')
      setGender(currentUser.gender || '')
      setWeeklyMileage(currentUser.weeklyMileage?.toString() || '')
      setFiveKPR(currentUser.manualPRs?.fiveK || '')
      setTenKPR(currentUser.manualPRs?.tenK || '')
      setHalfMarathonPR(currentUser.manualPRs?.halfMarathon || '')
    }
  }, [currentUser, hasValidUser])

  // Redirect if user needs creation or not onboarded
  useEffect(() => {
    if (currentUser && 'needsCreation' in currentUser) {
      // User needs to be created - redirect to home
      router.push('/')
      return
    }
    if (hasValidUser && !currentUser.onboardingComplete) {
      router.push('/onboarding')
    }
  }, [currentUser, hasValidUser, router])

  // Find today's workout
  useEffect(() => {
    if (planByWeek?.weeks) {
      const today = new Date().toISOString().split('T')[0]
      for (const week of planByWeek.weeks) {
        const todayWorkout = week.workouts.find(
          (w: any) => w.date === today && w.type !== 'rest'
        )
        if (todayWorkout) {
          setHeroWorkout(todayWorkout)
          break
        }
      }
    }
  }, [planByWeek])

  // useCallback hooks - MUST be before any conditional returns (Rules of Hooks)
  const handleBuildPlan = useCallback(async (isRetry = false) => {
    if (!hasValidUser || !marathonDate || !daysPerWeek) return

    setIsGenerating(true)
    setGenerationError(null)
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Plan generation timed out. The AI is taking longer than expected. Please try again.'))
        }, 180000)
      })

      if (!hasValidUser) {
        throw new Error('User not found. Please refresh the page.')
      }
      
      const planPromise = generatePlan({
        marathonDate,
        daysPerWeek,
        userId: currentUser._id,
      })

      await Promise.race([planPromise, timeoutPromise])
      setShowPlanModal(false)
      setGenerationError(null)
      router.refresh()
    } catch (error: any) {
      console.error('Failed to generate plan:', error)
      // Set error state instead of alert - allows retry button
      setGenerationError(error.message || 'Failed to generate plan. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [hasValidUser, currentUser, marathonDate, daysPerWeek, generatePlan, router])

  const handleRetryGeneration = useCallback(() => {
    handleBuildPlan(true)
  }, [handleBuildPlan])

  // Loading state - prevent flashing content (AFTER all hooks)
  if (currentUser === undefined) {
    return <FullPageLoading message="Loading your dashboard..." />
  }

  // If user needs creation, show loading (redirect will happen)
  if (!hasValidUser) {
    return <FullPageLoading message="Setting up your account..." />
  }

  // Loading plan data (show skeleton while syncing)
  const isPlanLoading = hasValidUser && activePlan === undefined

  const hasActivePlan = activePlan !== undefined && activePlan !== null
  const accuracyScore = currentUser.accuracyScore || 50
  const hasMissingData = !currentUser.weeklyMileage || 
    (!currentUser.manualPRs?.fiveK && !currentUser.manualPRs?.tenK && !currentUser.manualPRs?.halfMarathon)

  const getMinDate = () => {
    const minDate = new Date()
    minDate.setDate(minDate.getDate() + 12 * 7)
    return minDate.toISOString().split('T')[0]
  }

  const handleSaveConnections = async () => {
    setIsSavingSettings(true)
    try {
      await updateConnections({
        stravaLink: stravaLink || undefined,
        terraApiKey: terraApiKey || undefined,
      })
    } catch (error: any) {
      console.error('Failed to save settings:', error)
      alert(`Failed to save: ${error.message}`)
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleSaveManualStats = async () => {
    setIsSavingManual(true)
    try {
      await updateManualStats({
        age: age ? parseInt(age) : undefined,
        gender: gender || undefined,
        weeklyMileage: weeklyMileage ? parseFloat(weeklyMileage) : undefined,
        fiveKPR: fiveKPR || undefined,
        tenKPR: tenKPR || undefined,
        halfMarathonPR: halfMarathonPR || undefined,
      })
      setShowSettings(false)
    } catch (error: any) {
      console.error('Failed to save manual stats:', error)
      alert(`Failed to save: ${error.message}`)
    } finally {
      setIsSavingManual(false)
    }
  }

  const handleResetPlan = async () => {
    setIsResetting(true)
    try {
      await clearWorkouts({})
      setShowResetConfirm(false)
      setShowSettings(false)
      setHeroWorkout(null)
      setExpandedWeek(null)
      // Open plan modal for new date
      setTimeout(() => {
        setShowPlanModal(true)
      }, 300)
    } catch (error: any) {
      console.error('Failed to reset plan:', error)
      alert(`Failed to reset: ${error.message}`)
    } finally {
      setIsResetting(false)
    }
  }

  const handleStartRun = (workout: any) => {
    if (!activePlan) return

    const params = new URLSearchParams({
      workoutId: activePlan._id,
      type: workout.type || 'easy',
      distance: workout.distance?.toString() || '0',
      targetPace: workout.targetPace || '',
      week: workout.week?.toString() || '1',
      day: workout.day?.toString() || '1',
    })

    router.push(`/run?${params.toString()}`)
  }

  const selectWorkoutAsHero = (workout: any) => {
    setHeroWorkout(workout)
    setExpandedWeek(null)
  }

  const getWeekTotalMileage = (week: any) => {
    return week.workouts
      .filter((w: any) => w.type !== 'rest')
      .reduce((sum: number, w: any) => sum + (w.distance || 0), 0)
      .toFixed(1)
  }

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'easy':
      case 'easy run':
        return 'text-emerald-400'
      case 'tempo':
        return 'text-orange-400'
      case 'threshold':
        return 'text-amber-400'
      case 'intervals':
      case 'interval':
        return 'text-red-400'
      case 'long run':
      case 'long':
        return 'text-blue-400'
      default:
        return 'text-gray-400'
    }
  }

  const getAccuracyColor = (score: number) => {
    if (score >= 85) return 'text-[#00ff88]'
    if (score >= 70) return 'text-yellow-400'
    return 'text-orange-400'
  }

  const stravaConnected = !!currentUser?.stravaLink
  const terraConnected = !!currentUser?.terraApiKey

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Focused Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88] to-emerald-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-lg tracking-tight">FreeRunna</span>
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Settings"
            >
              <Settings2 className="w-5 h-5 text-gray-400" />
            </button>
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8"
                }
              }}
            />
          </div>
        </div>
      </header>

      {/* Settings Sheet */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 rounded-t-3xl border-t border-white/10 max-h-[90vh] overflow-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:rounded-2xl md:border"
            >
              {/* Handle */}
              <div className="md:hidden flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Settings</h2>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl">
                  <button
                    onClick={() => setSettingsTab('connections')}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                      settingsTab === 'connections'
                        ? "bg-[#00ff88] text-black"
                        : "text-gray-400 hover:text-white"
                    )}
                  >
                    <LinkIcon className="w-4 h-4 inline mr-2" />
                    Connections
                  </button>
                  <button
                    onClick={() => setSettingsTab('manual')}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                      settingsTab === 'manual'
                        ? "bg-[#00ff88] text-black"
                        : "text-gray-400 hover:text-white"
                    )}
                  >
                    <User className="w-4 h-4 inline mr-2" />
                    Manual Entry
                  </button>
                </div>

                {/* Connections Tab */}
                {settingsTab === 'connections' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-4">Integration Hub</h3>

                      {/* Strava */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Strava Public URL</label>
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            stravaConnected ? "bg-[#00ff88]" : "bg-gray-600"
                          )} />
                        </div>
                        <input
                          type="url"
                          value={stravaLink}
                          onChange={(e) => setStravaLink(e.target.value)}
                          placeholder="https://www.strava.com/athletes/..."
                          className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/20 transition-all text-white placeholder:text-gray-600"
                        />
                      </div>

                      {/* Terra */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Terra API Key</label>
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            terraConnected ? "bg-[#00ff88]" : "bg-gray-600"
                          )} />
                        </div>
                        <input
                          type="password"
                          value={terraApiKey}
                          onChange={(e) => setTerraApiKey(e.target.value)}
                          placeholder="Enter your Terra API key..."
                          className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/20 transition-all text-white placeholder:text-gray-600"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveConnections}
                      disabled={isSavingSettings}
                      className="w-full py-3 px-4 bg-[#00ff88] text-black rounded-xl font-bold hover:bg-[#00e677] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSavingSettings ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Update Connections'
                      )}
                    </button>

                    {/* Status */}
                    <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          stravaConnected ? "bg-[#00ff88]" : "bg-gray-600"
                        )} />
                        Strava
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          terraConnected ? "bg-[#00ff88]" : "bg-gray-600"
                        )} />
                        Terra
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Entry Tab */}
                {settingsTab === 'manual' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Personal Info
                      </h3>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Age */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Age</label>
                          <input
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            placeholder="30"
                            min="16"
                            max="100"
                            className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/20 transition-all text-white placeholder:text-gray-600"
                          />
                        </div>

                        {/* Gender */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Gender</label>
                          <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value as any)}
                            className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/20 transition-all text-white"
                          >
                            <option value="">Select...</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      {/* Weekly Mileage */}
                      <div className="space-y-2 mb-6">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-gray-400" />
                          Avg Weekly Mileage (last 4 weeks)
                        </label>
                        <input
                          type="number"
                          value={weeklyMileage}
                          onChange={(e) => setWeeklyMileage(e.target.value)}
                          placeholder="25"
                          min="0"
                          max="200"
                          className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/20 transition-all text-white placeholder:text-gray-600"
                        />
                        <p className="text-xs text-gray-500">
                          This affects your &ldquo;Mileage Tax&rdquo; prediction accuracy
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                        <Timer className="w-4 h-4" />
                        Recent PRs (enter at least one)
                      </h3>

                      <div className="space-y-4">
                        {/* 5K PR */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">5K PR</label>
                          <input
                            type="text"
                            value={fiveKPR}
                            onChange={(e) => setFiveKPR(e.target.value)}
                            placeholder="MM:SS (e.g., 22:30)"
                            className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/20 transition-all text-white placeholder:text-gray-600"
                          />
                        </div>

                        {/* 10K PR */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">10K PR</label>
                          <input
                            type="text"
                            value={tenKPR}
                            onChange={(e) => setTenKPR(e.target.value)}
                            placeholder="MM:SS (e.g., 47:00)"
                            className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/20 transition-all text-white placeholder:text-gray-600"
                          />
                        </div>

                        {/* Half Marathon PR */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Half Marathon PR</label>
                          <input
                            type="text"
                            value={halfMarathonPR}
                            onChange={(e) => setHalfMarathonPR(e.target.value)}
                            placeholder="HH:MM:SS (e.g., 1:45:00)"
                            className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/20 transition-all text-white placeholder:text-gray-600"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveManualStats}
                      disabled={isSavingManual}
                      className="w-full py-3 px-4 bg-[#00ff88] text-black rounded-xl font-bold hover:bg-[#00e677] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSavingManual ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Stats'
                      )}
                    </button>

                    {/* Computed Stats Preview */}
                    {(currentUser?.vdotScore || currentUser?.predictedMarathonPace) && (
                      <div className="p-4 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-xl">
                        <h4 className="text-sm font-medium text-[#00ff88] mb-3">Computed Predictions</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {currentUser?.vdotScore && (
                            <div>
                              <div className="text-gray-400">VDOT Score</div>
                              <div className="text-xl font-bold">{currentUser.vdotScore}</div>
                            </div>
                          )}
                          {currentUser?.predictedMarathonPace && (
                            <div>
                              <div className="text-gray-400">Marathon Pace</div>
                              <div className="text-xl font-bold">{currentUser.predictedMarathonPace}/mi</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reset Plan Section */}
                {hasActivePlan && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    {!showResetConfirm ? (
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="w-full py-3 px-4 bg-red-500/10 text-red-400 rounded-xl font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reset Plan & Choose New Date
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-400 text-center">
                          This will delete your current plan. Are you sure?
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowResetConfirm(false)}
                            className="flex-1 py-3 px-4 bg-white/5 text-gray-400 rounded-xl font-medium hover:bg-white/10 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleResetPlan}
                            disabled={isResetting}
                            className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isResetting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Resetting...
                              </>
                            ) : (
                              'Yes, Reset'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Accuracy Score & Warning Banner */}
          {hasActivePlan && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              {/* Accuracy Score */}
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Plan Accuracy:</span>
                <span className={cn("text-sm font-bold", getAccuracyColor(accuracyScore))}>
                  {accuracyScore}%
                </span>
              </div>

              {/* Missing Data Warning */}
              {hasMissingData && (
                <button
                  onClick={() => {
                    setSettingsTab('manual')
                    setShowSettings(true)
                  }}
                  className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden sm:inline">Add data for better accuracy</span>
                  <span className="sm:hidden">Add data</span>
                </button>
              )}
            </motion.div>
          )}

          {/* Missing Data Banner (more prominent) */}
          {hasActivePlan && hasMissingData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-orange-400">Missing Data</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Your plan may be too aggressive. Add your weekly mileage and a recent PR for a more accurate plan.
                  </p>
                  <button
                    onClick={() => {
                      setSettingsTab('manual')
                      setShowSettings(true)
                    }}
                    className="mt-2 text-xs text-orange-400 font-medium hover:text-orange-300 transition-colors flex items-center gap-1"
                  >
                    Enter stats manually
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Current Mission - Hero Card */}
          {hasActivePlan && heroWorkout && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-zinc-900 to-black rounded-3xl p-8 border border-white/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#00ff88]/10 rounded-full blur-[80px]" />
              
              <div className="relative">
                <div className="text-sm text-[#00ff88] font-medium mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Current Mission
                </div>
                
                <div className="mb-6">
                  <h1 className={cn("text-4xl sm:text-5xl font-bold mb-1", getTypeColor(heroWorkout.type))}>
                    {heroWorkout.type}
                  </h1>
                  <p className="text-gray-500 text-sm">
                    {heroWorkout.date ? new Date(heroWorkout.date).toLocaleDateString('en-US', { 
                      weekday: 'long', month: 'short', day: 'numeric' 
                    }) : 'Today'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <div className="text-6xl sm:text-7xl font-bold tracking-tight">
                      {heroWorkout.distance || 0}
                    </div>
                    <div className="text-gray-500 text-sm">miles</div>
                  </div>
                  <div>
                    <div className="text-4xl sm:text-5xl font-bold text-[#00ff88]">
                      {heroWorkout.targetPace || '--:--'}
                    </div>
                    <div className="text-gray-500 text-sm">target pace</div>
                  </div>
                </div>

                {heroWorkout.description && (
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    {heroWorkout.description}
                  </p>
                )}

                <button
                  onClick={() => handleStartRun(heroWorkout)}
                  className="w-full py-4 px-6 bg-[#00ff88] text-black rounded-2xl font-bold text-lg hover:bg-[#00e677] transition-all flex items-center justify-center gap-3 group"
                >
                  <Play className="w-6 h-6 fill-current" />
                  Start Run
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {/* No Plan State */}
          {!hasActivePlan && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-zinc-900 to-black rounded-3xl p-8 border border-white/10 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#00ff88]/10 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-[#00ff88]" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Ready to Train?</h2>
              <p className="text-gray-400 mb-4 max-w-sm mx-auto">
                Generate your personalized marathon training plan powered by AI.
              </p>
              
              {/* Quick Setup Prompt */}
              {hasMissingData && (
                <div className="mb-6 p-4 bg-white/5 rounded-xl text-left">
                  <p className="text-sm text-gray-400 mb-2">
                    💡 For the most accurate plan, first add your stats:
                  </p>
                  <button
                    onClick={() => {
                      setSettingsTab('manual')
                      setShowSettings(true)
                    }}
                    className="text-sm text-[#00ff88] font-medium hover:underline"
                  >
                    Enter your PRs & weekly mileage →
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setShowPlanModal(true)}
                className="px-8 py-4 bg-[#00ff88] text-black rounded-2xl font-bold text-lg hover:bg-[#00e677] transition-all inline-flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Build My Plan
              </button>
            </motion.div>
          )}

          {/* Minimalist Timeline */}
          {hasActivePlan && planByWeek && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                {planByWeek.totalWeeks}-Week Training Plan
              </h2>
              
              {planByWeek.weeks.map((week) => {
                const isExpanded = expandedWeek === week.week
                const totalMileage = getWeekTotalMileage(week)
                const runsCount = week.workouts.filter((w: any) => w.type !== 'rest').length

                return (
                  <div key={week.week} className="border border-white/5 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedWeek(isExpanded ? null : week.week)}
                      className="w-full px-4 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-[#00ff88] font-bold text-sm w-16">
                          Week {week.week}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {runsCount} runs • {totalMileage} mi
                        </span>
                      </div>
                      <ChevronDown 
                        className={cn(
                          "w-5 h-5 text-gray-500 transition-transform",
                          isExpanded && "rotate-180"
                        )} 
                      />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-2">
                            {week.workouts
                              .filter((w: any) => w.type !== 'rest')
                              .map((workout: any, idx: number) => {
                                const isHero = heroWorkout?.date === workout.date
                                const dayName = workout.date 
                                  ? new Date(workout.date).toLocaleDateString('en-US', { weekday: 'short' })
                                  : `Day ${workout.day || idx + 1}`

                                return (
                                  <button
                                    key={workout.date || `${week.week}-${idx}`}
                                    onClick={() => selectWorkoutAsHero(workout)}
                                    className={cn(
                                      "w-full px-4 py-3 rounded-lg flex items-center justify-between transition-all text-left",
                                      isHero 
                                        ? "bg-[#00ff88]/10 border border-[#00ff88]/30" 
                                        : "bg-white/5 hover:bg-white/10 border border-transparent"
                                    )}
                                  >
                                    <div className="flex items-center gap-4">
                                      <span className="text-gray-500 text-sm w-10">{dayName}</span>
                                      <span className={cn("font-medium", getTypeColor(workout.type))}>
                                        {workout.type}
                                      </span>
                                    </div>
                                    <span className="text-white font-bold">
                                      {workout.distance || 0} mi
                                    </span>
                                  </button>
                                )
                              })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Plan Builder Modal */}
      <AnimatePresence>
        {showPlanModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isGenerating && setShowPlanModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="bg-zinc-950 rounded-2xl border border-white/10 p-6 relative">
                {!isGenerating && (
                  <button
                    onClick={() => setShowPlanModal(false)}
                    className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                )}

                {/* Generation Error State with Retry */}
                {generationError && !isGenerating ? (
                  <div className="py-8 text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-red-400">Generation Failed</h3>
                      <p className="text-sm text-gray-400 max-w-sm mx-auto">{generationError}</p>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={handleRetryGeneration}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#00ff88] text-black rounded-xl font-bold hover:bg-[#00e677] transition-colors"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Retry
                      </button>
                      <button
                        onClick={() => {
                          setGenerationError(null)
                          setShowPlanModal(false)
                        }}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : isGenerating ? (
                  <div className="py-8 text-center space-y-6">
                    <Loader2 className="w-12 h-12 text-[#00ff88] animate-spin mx-auto" />
                    <div>
                      <h3 className="text-xl font-bold mb-2">
                        {currentUser?.generationProgress
                          ? `Generating Weeks ${Math.max(1, currentUser.generationProgress.currentWeek - 3)}-${currentUser.generationProgress.currentWeek}...`
                          : 'Building your plan...'}
                      </h3>
                      <p className="text-sm text-gray-400">This takes about 1-2 minutes.</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00ff88] rounded-full transition-all duration-300"
                          style={{
                            width: currentUser?.generationProgress
                              ? `${(currentUser.generationProgress.currentWeek / currentUser.generationProgress.totalWeeks) * 100}%`
                              : '10%',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold mb-1">Build Your Plan</h2>
                      <p className="text-sm text-gray-400">Set your marathon date and training frequency.</p>
                    </div>

                    {/* Show prediction info if available */}
                    {currentUser?.predictedMarathonPace && (
                      <div className="p-4 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-xl">
                        <div className="text-xs text-gray-400 mb-1">Your predicted marathon pace</div>
                        <div className="text-2xl font-bold text-[#00ff88]">
                          {currentUser.predictedMarathonPace}/mi
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Based on your VDOT of {currentUser.vdotScore}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                        <Calendar className="w-4 h-4" />
                        Marathon Date
                      </label>
                      <input
                        type="date"
                        value={marathonDate}
                        onChange={(e) => setMarathonDate(e.target.value)}
                        min={getMinDate()}
                        className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/20 transition-all text-white"
                      />
                      <p className="text-xs text-gray-500">At least 12 weeks out</p>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                        <Activity className="w-4 h-4" />
                        Days Per Week
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {([3, 4, 5, 6] as const).map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setDaysPerWeek(days)}
                            className={cn(
                              'py-3 rounded-xl font-medium transition-all border',
                              daysPerWeek === days
                                ? 'bg-[#00ff88] text-black border-[#00ff88] font-bold'
                                : 'bg-black text-gray-400 border-white/10 hover:border-white/20'
                            )}
                          >
                            {days}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleBuildPlan()}
                      disabled={!marathonDate || !daysPerWeek}
                      className={cn(
                        'w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2',
                        marathonDate && daysPerWeek
                          ? 'bg-[#00ff88] text-black hover:bg-[#00e677]'
                          : 'bg-white/5 text-gray-500 cursor-not-allowed'
                      )}
                    >
                      Generate Plan
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
