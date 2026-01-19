'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, Authenticated, Unauthenticated } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { SignInButton } from '@clerk/nextjs'
import { Link, Zap, Loader2 } from 'lucide-react'
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

function OnboardingContent() {
  const router = useRouter()
  const currentUser = useQuery(api.users.getCurrentUser)
  const connectData = useMutation(api.users.connectData)
  const analyzeActivities = useMutation(api.users.analyzeActivities)

  const [connectionType, setConnectionType] = useState<'link' | 'terra'>('link')
  const [linkUrl, setLinkUrl] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if already connected
  useEffect(() => {
    if (currentUser?.onboardingComplete) {
      router.push('/run')
    }
  }, [currentUser, router])

  // Show loading state while checking user
  if (currentUser === undefined) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ff88] mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
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
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setConnectionType('link')
                setError(null)
              }}
              className={cn(
                'flex-1 py-4 px-6 rounded-xl font-medium transition-all border-2',
                connectionType === 'link'
                  ? 'bg-[#00ff88]/10 border-[#00ff88] text-[#00ff88]'
                  : 'bg-[#0a0a0a] border-gray-700 text-gray-400 hover:border-gray-600'
              )}
            >
              <Link className="w-5 h-5 mx-auto mb-2" />
              Public Link
            </button>
            <button
              type="button"
              onClick={() => {
                setConnectionType('terra')
                setError(null)
              }}
              className={cn(
                'flex-1 py-4 px-6 rounded-xl font-medium transition-all border-2',
                connectionType === 'terra'
                  ? 'bg-[#00ff88]/10 border-[#00ff88] text-[#00ff88]'
                  : 'bg-[#0a0a0a] border-gray-700 text-gray-400 hover:border-gray-600'
              )}
            >
              <Zap className="w-5 h-5 mx-auto mb-2" />
              Terra API
            </button>
          </div>

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
