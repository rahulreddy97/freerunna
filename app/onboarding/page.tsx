'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, Authenticated, Unauthenticated } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { SignInButton } from '@clerk/nextjs'
import { Link, Zap, Loader2, User, Timer, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function OnboardingPage() {
  return (
    <>
      <Authenticated>
        <OnboardingContent />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Sign in to continue</h1>
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-[#00ff88] text-[#0a0a0a] rounded-xl font-bold hover:bg-[#00e677] transition-colors">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
    </>
  )
}

// Type guard to check if user is a valid user (not needs creation)
function isValidUser(user: any): user is { _id: any; onboardingComplete: boolean; [key: string]: any } {
  return user && '_id' in user && !('needsCreation' in user)
}

function OnboardingContent() {
  const router = useRouter()
  const currentUser = useQuery(api.users.getCurrentUser)
  const ensureUserExists = useMutation(api.users.ensureUserExists)
  const connectData = useMutation(api.users.connectData)
  const analyzeActivities = useMutation(api.users.analyzeActivities)
  const updateManualStats = useMutation(api.users.updateManualStats)

  const [connectionType, setConnectionType] = useState<'link' | 'terra' | 'manual'>('manual')
  const [linkUrl, setLinkUrl] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Manual entry state
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [weeklyMileage, setWeeklyMileage] = useState('')
  const [fiveKPR, setFiveKPR] = useState('')
  const [tenKPR, setTenKPR] = useState('')
  const [halfMarathonPR, setHalfMarathonPR] = useState('')
  const [isSavingManual, setIsSavingManual] = useState(false)

  const hasValidUser = isValidUser(currentUser)

  // Create user if needed
  useEffect(() => {
    const createUser = async () => {
      if (currentUser && 'needsCreation' in currentUser && !isCreatingUser) {
        setIsCreatingUser(true)
        try {
          await ensureUserExists()
        } catch (err) {
          console.error('Error creating user:', err)
        }
        setIsCreatingUser(false)
      }
    }
    createUser()
  }, [currentUser, ensureUserExists, isCreatingUser])

  // Redirect if already connected
  useEffect(() => {
    if (hasValidUser && currentUser.onboardingComplete) {
      router.push('/dashboard')
    }
  }, [currentUser, hasValidUser, router])

  // Show loading state while checking user or creating user
  if (currentUser === undefined || !hasValidUser) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ff88] mx-auto"></div>
          <p className="mt-4 text-gray-400">
            {isCreatingUser ? 'Setting up your account...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  const handleConnect = async () => {
    if (connectionType === 'link' && !linkUrl.trim()) {
      setError('Please enter a link')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      if (connectionType === 'link') {
        // Store the link and mark as connected
        await connectData({
          connectionType: 'link',
          linkUrl: linkUrl.trim(),
        })
      } else {
        // Terra API connection (placeholder - would need Terra OAuth flow)
        await connectData({
          connectionType: 'terra',
        })
      }

      // After connection, analyze activities
      setIsAnalyzing(true)
      await analyzeActivities()

      // Redirect to dashboard to show analysis results
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to connect. Please try again.')
      setIsConnecting(false)
      setIsAnalyzing(false)
    }
  }

  const handleManualSubmit = async () => {
    // Validate at least one PR is provided
    if (!fiveKPR && !tenKPR && !halfMarathonPR) {
      setError('Please enter at least one recent PR time')
      return
    }

    setIsSavingManual(true)
    setError(null)

    try {
      await updateManualStats({
        age: age ? parseInt(age) : undefined,
        gender: gender || undefined,
        weeklyMileage: weeklyMileage ? parseFloat(weeklyMileage) : undefined,
        fiveKPR: fiveKPR || undefined,
        tenKPR: tenKPR || undefined,
        halfMarathonPR: halfMarathonPR || undefined,
      })

      // Mark onboarding as complete and go to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to save. Please try again.')
    } finally {
      setIsSavingManual(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Connect Your Data</h1>
          <p className="text-gray-400 text-lg">
            We'll automatically analyze your activities to determine your fitness level
          </p>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-8 space-y-6">
          {/* Connection Type Toggle */}
          <div className="flex gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                setConnectionType('manual')
                setError(null)
              }}
              className={cn(
                'flex-1 py-4 px-3 sm:px-6 rounded-xl font-medium transition-all border-2',
                connectionType === 'manual'
                  ? 'bg-[#00ff88]/10 border-[#00ff88] text-[#00ff88]'
                  : 'bg-[#0a0a0a] border-gray-700 text-gray-400 hover:border-gray-600'
              )}
            >
              <User className="w-5 h-5 mx-auto mb-2" />
              <span className="text-sm">Manual</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setConnectionType('link')
                setError(null)
              }}
              className={cn(
                'flex-1 py-4 px-3 sm:px-6 rounded-xl font-medium transition-all border-2',
                connectionType === 'link'
                  ? 'bg-[#00ff88]/10 border-[#00ff88] text-[#00ff88]'
                  : 'bg-[#0a0a0a] border-gray-700 text-gray-400 hover:border-gray-600'
              )}
            >
              <Link className="w-5 h-5 mx-auto mb-2" />
              <span className="text-sm">Strava Link</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setConnectionType('terra')
                setError(null)
              }}
              className={cn(
                'flex-1 py-4 px-3 sm:px-6 rounded-xl font-medium transition-all border-2',
                connectionType === 'terra'
                  ? 'bg-[#00ff88]/10 border-[#00ff88] text-[#00ff88]'
                  : 'bg-[#0a0a0a] border-gray-700 text-gray-400 hover:border-gray-600'
              )}
            >
              <Zap className="w-5 h-5 mx-auto mb-2" />
              <span className="text-sm">Terra API</span>
            </button>
          </div>

          {/* Manual Entry Form */}
          {connectionType === 'manual' && (
            <div className="space-y-6">
              {/* Personal Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Personal Info (Optional)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="30"
                      min="16"
                      max="100"
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-700 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-2 focus:ring-[#00ff88]/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-700 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-2 focus:ring-[#00ff88]/20 transition-all"
                    >
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Weekly Mileage */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Training Volume
                </h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Avg Weekly Mileage (last 4 weeks)
                  </label>
                  <input
                    type="number"
                    value={weeklyMileage}
                    onChange={(e) => setWeeklyMileage(e.target.value)}
                    placeholder="25"
                    min="0"
                    max="200"
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-700 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-2 focus:ring-[#00ff88]/20 transition-all"
                  />
                  <p className="text-xs text-gray-500">
                    This helps us calculate your &ldquo;Mileage Tax&rdquo; for more accurate pacing
                  </p>
                </div>
              </div>

              {/* PRs */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Recent PRs (enter at least one)
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">5K PR</label>
                    <input
                      type="text"
                      value={fiveKPR}
                      onChange={(e) => setFiveKPR(e.target.value)}
                      placeholder="MM:SS (e.g., 22:30)"
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-700 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-2 focus:ring-[#00ff88]/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">10K PR</label>
                    <input
                      type="text"
                      value={tenKPR}
                      onChange={(e) => setTenKPR(e.target.value)}
                      placeholder="MM:SS (e.g., 47:00)"
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-700 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-2 focus:ring-[#00ff88]/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Half Marathon PR</label>
                    <input
                      type="text"
                      value={halfMarathonPR}
                      onChange={(e) => setHalfMarathonPR(e.target.value)}
                      placeholder="HH:MM:SS (e.g., 1:45:00)"
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-700 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-2 focus:ring-[#00ff88]/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleManualSubmit}
                disabled={isSavingManual || (!fiveKPR && !tenKPR && !halfMarathonPR)}
                className={cn(
                  'w-full py-4 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2',
                  isSavingManual || (!fiveKPR && !tenKPR && !halfMarathonPR)
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-[#00ff88] text-[#0a0a0a] hover:bg-[#00e677]'
                )}
              >
                {isSavingManual ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Continue to Dashboard'
                )}
              </button>
            </div>
          )}

          {/* Link Input */}
          {connectionType === 'link' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Paste your Strava or Garmin public profile link
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://www.strava.com/athletes/..."
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-700 rounded-xl focus:outline-none focus:border-[#00ff88] focus:ring-2 focus:ring-[#00ff88]/20 transition-all"
              />
              <p className="text-xs text-gray-500">
                We'll scan your last 3 months of activities to determine your best 5K and fitness level
              </p>
            </div>
          )}

          {/* Terra Connection Info */}
          {connectionType === 'terra' && (
            <div className="space-y-4 p-4 bg-[#0a0a0a] rounded-xl border border-gray-700">
              <p className="text-sm text-gray-300">
                Connect your Garmin or Whoop account via Terra API to automatically sync your data.
              </p>
              <button
                type="button"
                className="w-full py-3 px-4 bg-[#00ff88] text-[#0a0a0a] rounded-xl font-bold hover:bg-[#00e677] transition-colors"
                onClick={handleConnect}
                disabled={isConnecting || isAnalyzing}
              >
                {isConnecting ? 'Connecting...' : 'Connect Terra Account'}
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Connect Button for Link */}
          {connectionType === 'link' && (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting || isAnalyzing || !linkUrl.trim()}
              className={cn(
                'w-full py-4 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2',
                isConnecting || isAnalyzing || !linkUrl.trim()
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-[#00ff88] text-[#0a0a0a] hover:bg-[#00e677]'
              )}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing activities...
                </>
              ) : (
                'Connect & Analyze'
              )}
            </button>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Your data is processed securely and used only to generate your training plan</p>
        </div>
      </div>
    </div>
  )
}
