'use client'

import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInButton } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'
import { useRouter } from 'next/navigation'
import { useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Activity,
  Headphones,
  Calendar,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'

export default function Home() {
  return (
    <>
      <Authenticated>
        <AuthenticatedRedirect />
      </Authenticated>
      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>
    </>
  )
}

// Type guard to check if user is a valid user (not needs creation)
function isValidUser(user: any): user is { _id: any; onboardingComplete: boolean; [key: string]: any } {
  return user && '_id' in user && !('needsCreation' in user)
}

function AuthenticatedRedirect() {
  const router = useRouter()
  const currentUser = useQuery(api.users.getCurrentUser)
  const ensureUserExists = useMutation(api.users.ensureUserExists)
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  // Handle user creation for first-time logins
  const handleUserCreation = useCallback(async () => {
    if (isCreatingUser) return
    setIsCreatingUser(true)
    try {
      await ensureUserExists()
      // After creation, the query will automatically refresh
    } catch (error) {
      console.error('Error creating user:', error)
    }
    setIsCreatingUser(false)
  }, [ensureUserExists, isCreatingUser])

  useEffect(() => {
    if (currentUser) {
      // Check if user needs to be created (first-time login)
      if ('needsCreation' in currentUser && currentUser.needsCreation) {
        handleUserCreation()
        return
      }

      // User exists and is valid, redirect based on onboarding status
      if (isValidUser(currentUser)) {
        if (!currentUser.onboardingComplete) {
          router.push('/onboarding')
        } else {
          router.push('/dashboard')
        }
      }
    }
  }, [currentUser, router, handleUserCreation])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ff88] mx-auto"></div>
        <p className="mt-4 text-gray-400">
          {isCreatingUser ? 'Setting up your account...' : 'Loading your dashboard...'}
        </p>
      </div>
    </div>
  )
}

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Simple Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#00ff88] flex items-center justify-center">
                <Activity className="w-5 h-5 text-black" />
              </div>
              <span className="font-bold text-lg">FreeRunna</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <SignInButton mode="modal">
                <button className="text-gray-400 hover:text-white transition-colors text-sm">
                  Sign In
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="bg-[#00ff88] text-black px-4 py-2 rounded-lg font-semibold text-sm">
                  Get Started
                </button>
              </SignInButton>
            </div>

            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-black border-b border-white/5 px-6 py-4">
            <SignInButton mode="modal">
              <button className="w-full bg-[#00ff88] text-black px-4 py-3 rounded-lg font-semibold">
                Get Started
              </button>
            </SignInButton>
          </div>
        )}
      </nav>

      {/* Hero - Simple & Honest */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Simple Badge */}
            <div className="inline-flex items-center gap-2 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-full px-3 py-1 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-xs text-[#00ff88]">Open Source & Free Forever</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
              AI-Powered Marathon Training
            </h1>

            <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
              We&apos;re building a free, open-source marathon coach. Enter your race date, 
              tell us how many days you can run, and our AI generates a personalized training plan.
            </p>

            <SignInButton mode="modal">
              <button className="bg-[#00ff88] text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#00ff88]/90 transition-colors">
                Create My Plan
              </button>
            </SignInButton>

            <p className="mt-4 text-sm text-gray-500">
              26.2 miles starts with one click.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What We're Building */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">What We&apos;re Building</h2>
          
          <div className="space-y-6">
            <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-[#00ff88]/20 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-[#00ff88]" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Personalized Training Plans</h3>
                <p className="text-sm text-gray-400">
                  Using Google&apos;s Gemini AI to generate week-by-week marathon plans based on your 
                  fitness level, available time, and race date.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Wearable Integration (Coming Soon)</h3>
                <p className="text-sm text-gray-400">
                  Connect your Garmin, Whoop, or Strava to auto-adjust your plan based on 
                  recovery scores and actual run data.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Live Run Tracking</h3>
                <p className="text-sm text-gray-400">
                  GPS tracking with voice coaching during your runs. The app tells you 
                  when you&apos;re ahead or behind your target pace.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">How It Works</h2>
          
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            <div>
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Pick Your Race Date</h3>
              <p className="text-sm text-gray-400">
                Choose when your marathon is. We need at least 12 weeks.
              </p>
            </div>

            <div>
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Tell Us About You</h3>
              <p className="text-sm text-gray-400">
                Your current fitness, recent PRs, and how many days you can train.
              </p>
            </div>

            <div>
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Get Your Plan</h3>
              <p className="text-sm text-gray-400">
                AI generates your complete training schedule with target paces.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Preview */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-center">Sample Workout</h2>
          <p className="text-gray-400 text-center mb-8">This is what a generated workout looks like</p>
          
          <div className="bg-zinc-900 rounded-2xl p-6 border border-white/10 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-400">Week 8 · Tuesday</div>
                <div className="font-bold text-xl">Tempo Run</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#00ff88]">6 mi</div>
                <div className="text-sm text-gray-400">@ 8:30/mi</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Duration</div>
                <div className="font-semibold">~51 min</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">HR Zone</div>
                <div className="font-semibold">Zone 3</div>
              </div>
            </div>

            <div className="p-3 bg-[#00ff88]/10 rounded-lg border border-[#00ff88]/20">
              <div className="text-xs text-[#00ff88] font-medium mb-1">Instructions</div>
              <div className="text-sm text-gray-300">
                Warm up for 1 mile, then maintain tempo pace for 4 miles. Cool down for 1 mile.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Start?</h2>
          <p className="text-gray-400 mb-8">
            Create your account and generate your first training plan in under a minute.
          </p>
          
          <SignInButton mode="modal">
            <button className="bg-[#00ff88] text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#00ff88]/90 transition-colors">
              Get Started Free
            </button>
          </SignInButton>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span>FreeRunna</span>
          </div>
          <div>
            Built with Next.js, Convex, and Gemini AI
          </div>
          <div>
            © {new Date().getFullYear()}
          </div>
        </div>
      </footer>
    </div>
  )
}
