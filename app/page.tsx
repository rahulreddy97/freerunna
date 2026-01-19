'use client'

import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInButton } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import {
  Activity,
  Zap,
  Headphones,
  ChevronRight,
  Star,
  Calendar,
  TrendingUp,
  Heart,
  Clock,
  MapPin,
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

function AuthenticatedRedirect() {
  const router = useRouter()
  const currentUser = useQuery(api.users.getCurrentUser)

  useEffect(() => {
    if (currentUser) {
      if (!currentUser.onboardingComplete) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }
    }
  }, [currentUser, router])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ff88] mx-auto"></div>
        <p className="mt-4 text-gray-400">Loading your dashboard...</p>
      </div>
    </div>
  )
}

// Sample workout data for the interactive preview
const samplePlan = [
  { week: 1, day: 'Mon', type: 'Easy Run', distance: '4 mi', pace: '9:30', color: 'bg-emerald-500' },
  { week: 1, day: 'Tue', type: 'Rest', distance: '-', pace: '-', color: 'bg-zinc-700' },
  { week: 1, day: 'Wed', type: 'Tempo', distance: '5 mi', pace: '8:15', color: 'bg-orange-500' },
  { week: 1, day: 'Thu', type: 'Easy Run', distance: '4 mi', pace: '9:30', color: 'bg-emerald-500' },
  { week: 1, day: 'Fri', type: 'Rest', distance: '-', pace: '-', color: 'bg-zinc-700' },
  { week: 1, day: 'Sat', type: 'Intervals', distance: '6 mi', pace: '7:45', color: 'bg-red-500' },
  { week: 1, day: 'Sun', type: 'Long Run', distance: '10 mi', pace: '9:15', color: 'bg-blue-500' },
  { week: 2, day: 'Mon', type: 'Easy Run', distance: '5 mi', pace: '9:20', color: 'bg-emerald-500' },
  { week: 2, day: 'Tue', type: 'Rest', distance: '-', pace: '-', color: 'bg-zinc-700' },
  { week: 2, day: 'Wed', type: 'Threshold', distance: '6 mi', pace: '8:00', color: 'bg-amber-500' },
  { week: 2, day: 'Thu', type: 'Easy Run', distance: '4 mi', pace: '9:30', color: 'bg-emerald-500' },
  { week: 2, day: 'Fri', type: 'Rest', distance: '-', pace: '-', color: 'bg-zinc-700' },
  { week: 2, day: 'Sat', type: 'Tempo', distance: '7 mi', pace: '8:10', color: 'bg-orange-500' },
  { week: 2, day: 'Sun', type: 'Long Run', distance: '12 mi', pace: '9:10', color: 'bg-blue-500' },
  { week: 3, day: 'Mon', type: 'Easy Run', distance: '5 mi', pace: '9:15', color: 'bg-emerald-500' },
  { week: 3, day: 'Tue', type: 'Intervals', distance: '5 mi', pace: '7:30', color: 'bg-red-500' },
  { week: 3, day: 'Wed', type: 'Rest', distance: '-', pace: '-', color: 'bg-zinc-700' },
  { week: 3, day: 'Thu', type: 'Tempo', distance: '6 mi', pace: '8:05', color: 'bg-orange-500' },
  { week: 3, day: 'Fri', type: 'Easy Run', distance: '4 mi', pace: '9:30', color: 'bg-emerald-500' },
  { week: 3, day: 'Sat', type: 'Rest', distance: '-', pace: '-', color: 'bg-zinc-700' },
  { week: 3, day: 'Sun', type: 'Long Run', distance: '14 mi', pace: '9:05', color: 'bg-blue-500' },
]

const testimonials = [
  {
    name: 'Sarah Chen',
    title: 'Sub-3:00 Marathoner',
    avatar: 'SC',
    quote: 'Finally, an AI that understands when I need to push and when I need to rest. PR\'d by 8 minutes.',
  },
  {
    name: 'Marcus Johnson',
    title: 'First-Time Marathoner',
    avatar: 'MJ',
    quote: 'Went from couch to 26.2 in 18 weeks. The voice coaching kept me honest on every run.',
  },
  {
    name: 'Elena Rodriguez',
    title: 'Boston Qualifier',
    avatar: 'ER',
    quote: 'The Whoop integration is game-changing. My coach adjusts my plan based on my actual recovery.',
  },
]

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const planRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: planRef,
    offset: ['start end', 'end start'],
  })
  const planY = useTransform(scrollYProgress, [0, 1], [100, -100])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88] to-emerald-600 flex items-center justify-center">
                <Activity className="w-5 h-5 text-black" />
              </div>
              <span className="font-bold text-xl tracking-tight">FreeRunna</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-gray-400 hover:text-white transition-colors text-sm">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors text-sm">
                Pricing
              </Link>
              <SignInButton mode="modal">
                <button className="text-gray-400 hover:text-white transition-colors text-sm">
                  Sign In
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="bg-[#00ff88] text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#00ff88]/90 transition-colors">
                  Get Started Free
                </button>
              </SignInButton>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-[#0a0a0a] border-b border-white/5 px-4 py-4"
          >
            <div className="flex flex-col gap-4">
              <Link href="#features" className="text-gray-400 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">
                Pricing
              </Link>
              <SignInButton mode="modal">
                <button className="text-gray-400 hover:text-white transition-colors text-left">
                  Sign In
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="bg-[#00ff88] text-black px-4 py-3 rounded-lg font-semibold hover:bg-[#00ff88]/90 transition-colors w-full">
                  Get Started Free
                </button>
              </SignInButton>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Background Gradient */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#00ff88]/10 rounded-full blur-[120px]" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-6">
                <div className="flex -space-x-2">
                  {['bg-emerald-500', 'bg-blue-500', 'bg-purple-500'].map((color, i) => (
                    <div key={i} className={`w-6 h-6 rounded-full ${color} border-2 border-[#0a0a0a]`} />
                  ))}
                </div>
                <span className="text-sm text-gray-400">Trusted by 500+ Austin Runners</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                The AI Coach That{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff88] to-emerald-400">
                  Actually Knows
                </span>{' '}
                Your Body.
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-xl">
                Stop guessing your paces. We sync your Whoop recovery, analyze your Strava history, 
                and build a <span className="text-white font-medium">112-day marathon plan</span> tailored 
                to your exact fitness level.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <SignInButton mode="modal">
                  <button className="group bg-[#00ff88] text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#00ff88]/90 transition-all hover:scale-105 flex items-center justify-center gap-2">
                    Build My Free Plan
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </SignInButton>
                <Link
                  href="#features"
                  className="px-8 py-4 rounded-xl font-semibold text-lg border border-white/20 hover:bg-white/5 transition-colors text-center"
                >
                  See How It Works
                </Link>
              </div>

              {/* Stats */}
              <div className="flex gap-8 mt-10 pt-10 border-t border-white/10">
                {[
                  { value: '2,847', label: 'Plans Generated' },
                  { value: '18min', label: 'Avg PR Improvement' },
                  { value: '94%', label: 'Completion Rate' },
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="text-2xl font-bold text-[#00ff88]">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right: Floating Bento Preview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative">
                {/* Main Workout Card */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl p-6 border border-white/10 shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#00ff88]/20 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-[#00ff88]" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Today&apos;s Run</div>
                        <div className="font-bold text-lg">Tempo Run</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#00ff88]">6 mi</div>
                      <div className="text-sm text-gray-400">@ 8:45 pace</div>
                    </div>
                  </div>

                  {/* Workout Details */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <Clock className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                      <div className="font-semibold">52:30</div>
                      <div className="text-xs text-gray-500">Duration</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <Heart className="w-5 h-5 mx-auto text-red-400 mb-1" />
                      <div className="font-semibold">Z3-Z4</div>
                      <div className="text-xs text-gray-500">HR Zone</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <TrendingUp className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                      <div className="font-semibold">+12%</div>
                      <div className="text-xs text-gray-500">vs Last Week</div>
                    </div>
                  </div>

                  {/* Coach Note */}
                  <div className="mt-6 p-4 bg-[#00ff88]/10 rounded-lg border border-[#00ff88]/20">
                    <div className="text-sm text-[#00ff88] font-medium mb-1">Coach&apos;s Note</div>
                    <div className="text-sm text-gray-300">
                      &ldquo;Start easy for the first mile. Build into tempo pace after warmup. 
                      Focus on controlled breathing.&rdquo;
                    </div>
                  </div>
                </motion.div>

                {/* Floating Recovery Card */}
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute -bottom-6 -left-6 bg-zinc-900 rounded-xl p-4 border border-white/10 shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-green-400">78</span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Whoop Recovery</div>
                      <div className="font-semibold text-green-400">Ready to Push</div>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Week Progress */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute -top-4 -right-4 bg-zinc-900 rounded-xl p-4 border border-white/10 shadow-xl"
                >
                  <div className="text-xs text-gray-400 mb-2">Week 8 of 16</div>
                  <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-1/2 h-full bg-gradient-to-r from-[#00ff88] to-emerald-500 rounded-full" />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Peak Phase</div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bio-Sync Feature Grid */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-950/10 to-transparent" />
        
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-full px-4 py-2 mb-6">
              <Zap className="w-4 h-4 text-[#00ff88]" />
              <span className="text-sm text-[#00ff88]">Bio-Sync Technology</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Your Wearables. Your Plan. <span className="text-[#00ff88]">In Perfect Sync.</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              We don&apos;t just generate a plan—we continuously adapt it based on your body&apos;s real-time signals.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1: Whoop/Garmin Sync */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="group bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl p-8 border border-white/5 hover:border-[#00ff88]/30 transition-all hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Activity className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Whoop &amp; Garmin Sync</h3>
              <p className="text-gray-400 leading-relaxed">
                Your recovery score dictates your intensity. Feeling tired? The AI automatically 
                scales back today&apos;s run. Fully recovered? Time to push harder.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[#00ff88] text-sm font-medium">
                <span>Real-time adaptation</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.div>

            {/* Feature 2: Gemini-Powered */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="group bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl p-8 border border-white/5 hover:border-[#00ff88]/30 transition-all hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-600/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Gemini-Powered Logic</h3>
              <p className="text-gray-400 leading-relaxed">
                No generic PDFs. Every single workout is generated by Gemini 2.5 Flash 
                for elite-level precision, tailored to your exact fitness profile.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[#00ff88] text-sm font-medium">
                <span>112 unique workouts</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.div>

            {/* Feature 3: Live Voice Pacing */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="group bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl p-8 border border-white/5 hover:border-[#00ff88]/30 transition-all hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-600/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Headphones className="w-7 h-7 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Live Voice Pacing</h3>
              <p className="text-gray-400 leading-relaxed">
                Real-time audio feedback through your headphones to keep you on your target pace. 
                &ldquo;Slow down, you&apos;re 15 seconds ahead. Relax into the rhythm.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-2 text-[#00ff88] text-sm font-medium">
                <span>Hands-free coaching</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof & Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-[#00ff88] text-[#00ff88]" />
              ))}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Runners Who <span className="text-[#00ff88]">Crushed Their Goals</span>
            </h2>
            <p className="text-gray-400">Real results from real athletes using FreeRunna</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-zinc-900/50 rounded-2xl p-6 border border-white/5"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00ff88] to-emerald-600 flex items-center justify-center font-bold text-black">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-[#00ff88]">{testimonial.title}</div>
                  </div>
                </div>
                <p className="text-gray-300 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Plan Preview */}
      <section ref={planRef} className="py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-400">16-Week Preview</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Every Day. <span className="text-[#00ff88]">Perfectly Planned.</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              See exactly what your 112-day journey looks like. Every run, every rest day, every pace—calculated for your success.
            </p>
          </motion.div>

          {/* Animated Plan Scroll */}
          <motion.div style={{ y: planY }} className="relative">
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10" />
            
            <div className="flex gap-3 overflow-hidden py-4">
              <motion.div
                animate={{ x: [0, -1000] }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="flex gap-3"
              >
                {[...samplePlan, ...samplePlan].map((workout, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-40 bg-zinc-900/80 rounded-xl p-4 border border-white/5 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Week {workout.week}</span>
                      <span className="text-xs font-medium text-gray-400">{workout.day}</span>
                    </div>
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium text-white mb-2 ${workout.color}`}>
                      {workout.type}
                    </div>
                    {workout.type !== 'Rest' && (
                      <div className="mt-2">
                        <div className="text-lg font-bold">{workout.distance}</div>
                        <div className="text-sm text-gray-400">@ {workout.pace}</div>
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>

          {/* CTA Below Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <SignInButton mode="modal">
              <button className="group bg-[#00ff88] text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#00ff88]/90 transition-all hover:scale-105 inline-flex items-center gap-2">
                Generate My Custom Plan
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </SignInButton>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#00ff88]/5 to-transparent" />
        
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Your Marathon Journey<br />
              <span className="text-[#00ff88]">Starts Today.</span>
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Join 500+ runners who&apos;ve transformed their training with AI-powered coaching. 
              No credit card required.
            </p>
            
            <SignInButton mode="modal">
              <button className="group bg-[#00ff88] text-black px-10 py-5 rounded-xl font-bold text-xl hover:bg-[#00ff88]/90 transition-all hover:scale-105 inline-flex items-center gap-3">
                Build My Free Plan
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </SignInButton>
            
            <p className="mt-6 text-sm text-gray-500">
              Free forever. No credit card needed. Start in 30 seconds.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ff88] to-emerald-600 flex items-center justify-center">
                <Activity className="w-5 h-5 text-black" />
              </div>
              <span className="font-bold text-lg">FreeRunna</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="#features" className="hover:text-white transition-colors">Features</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              <a href="mailto:support@freerunna.com" className="hover:text-white transition-colors">Support</a>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="w-4 h-4" />
              <span>Made for runners, by runners.</span>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/5 text-center text-sm text-gray-600">
            © {new Date().getFullYear()} FreeRunna. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
