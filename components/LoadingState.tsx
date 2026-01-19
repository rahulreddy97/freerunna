'use client'

import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  message?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingState({ 
  message = 'Loading...', 
  className,
  size = 'md' 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  return (
    <div className={cn(
      "min-h-screen bg-black text-white flex items-center justify-center",
      className
    )}>
      <div className="text-center space-y-4">
        <div className={cn(
          "animate-spin rounded-full border-b-2 border-[#00ff88] mx-auto",
          sizeClasses[size]
        )} />
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  )
}

// Skeleton loader for cards
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "bg-zinc-900 rounded-2xl p-6 border border-white/5 animate-pulse",
      className
    )}>
      <div className="space-y-4">
        <div className="h-4 bg-white/10 rounded w-1/3" />
        <div className="h-8 bg-white/10 rounded w-2/3" />
        <div className="h-4 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  )
}

// Skeleton loader for hero card
export function HeroCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-zinc-900 to-black rounded-3xl p-8 border border-white/10 animate-pulse">
      <div className="space-y-6">
        <div className="h-4 bg-white/10 rounded w-32" />
        <div className="space-y-2">
          <div className="h-12 bg-white/10 rounded w-48" />
          <div className="h-4 bg-white/10 rounded w-24" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="h-16 bg-white/10 rounded w-24" />
            <div className="h-3 bg-white/10 rounded w-12" />
          </div>
          <div className="space-y-2">
            <div className="h-12 bg-white/10 rounded w-20" />
            <div className="h-3 bg-white/10 rounded w-16" />
          </div>
        </div>
        <div className="h-14 bg-white/10 rounded-2xl w-full" />
      </div>
    </div>
  )
}

// Skeleton loader for timeline
export function TimelineSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 bg-white/10 rounded w-48 mb-4" />
      {[1, 2, 3, 4].map((i) => (
        <div 
          key={i} 
          className="border border-white/5 rounded-xl p-4 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-4 bg-white/10 rounded w-16" />
              <div className="h-4 bg-white/10 rounded w-24" />
            </div>
            <div className="h-5 w-5 bg-white/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Full page loading with logo
export function FullPageLoading({ message = 'Loading your dashboard...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <div className="text-center space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00ff88] to-emerald-600 flex items-center justify-center">
            <Activity className="w-7 h-7 text-black" />
          </div>
        </div>
        
        {/* Spinner */}
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-white/10 mx-auto" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full border-4 border-transparent border-t-[#00ff88] animate-spin" />
        </div>
        
        <p className="text-gray-400 text-sm">{message}</p>
      </div>
    </div>
  )
}
