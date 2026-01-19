'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Play, MapPin, Gauge, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkoutTileProps {
  workout: any
  isExpanded: boolean
  onExpand: () => void
  onStartRun: () => void
}

export function WorkoutTile({ workout, isExpanded, onExpand, onStartRun }: WorkoutTileProps) {
  const isRest = workout.type === 'rest'
  // Use date as primary key for layoutId, fallback to week-day combination
  const workoutKey = workout.date ? `workout-${workout.date}` : `workout-${workout.week}-${workout.day}`

  const getWorkoutTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'tempo':
        return {
          bg: 'bg-orange-500/20',
          text: 'text-orange-400',
          border: 'border-orange-500/30',
          glow: 'shadow-orange-500/20',
        }
      case 'interval':
      case 'threshold':
        return {
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          border: 'border-red-500/30',
          glow: 'shadow-red-500/20',
        }
      case 'long':
        return {
          bg: 'bg-blue-500/20',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
          glow: 'shadow-blue-500/20',
        }
      case 'easy':
        return {
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          border: 'border-green-500/30',
          glow: 'shadow-green-500/20',
        }
      case 'recovery':
        return {
          bg: 'bg-purple-500/20',
          text: 'text-purple-400',
          border: 'border-purple-500/30',
          glow: 'shadow-purple-500/20',
        }
      default:
        return {
          bg: 'bg-gray-500/20',
          text: 'text-gray-400',
          border: 'border-gray-500/30',
          glow: 'shadow-gray-500/20',
        }
    }
  }

  const getWorkoutTypeLabel = (type: string) => {
    if (!type || type === 'rest') return 'Rest Day'
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const colors = getWorkoutTypeColor(workout.type)

  if (isRest) {
    return (
      <motion.div
        layoutId={workoutKey}
        className="bg-black rounded-xl border-2 border-gray-800 p-4 opacity-60"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.6, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="text-center py-2">
          <div className="text-xs text-gray-500 mb-1">{formatDate(workout.date)}</div>
          <p className="text-sm text-gray-500">Rest Day</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      layoutId={workoutKey}
      className={cn(
        'bg-black rounded-xl border-2 p-4 cursor-pointer min-h-[80px] transition-all',
        isExpanded
          ? `border-[#00ff88] ${colors.glow} shadow-2xl z-50`
          : `${colors.border} hover:border-gray-600 hover:scale-[1.02]`
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: isExpanded ? 1.1 : 1,
      }}
      transition={{
        layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
        scale: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      }}
      onClick={onExpand}
    >
      {/* Compact View Only - Expanded view is handled by modal */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">{formatDate(workout.date)}</div>
          <div className={cn(
            'inline-block px-2 py-1 rounded-md text-xs font-semibold border',
            colors.bg,
            colors.text,
            colors.border
          )}>
            {getWorkoutTypeLabel(workout.type)}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span className="font-bold text-base">{workout.distance || 0}</span>
          <span className="text-gray-500 text-xs">miles</span>
        </div>
        {workout.targetPace && (
          <div className="flex items-center gap-2 text-sm">
            <Gauge className="w-4 h-4 text-gray-500" />
            <span className="font-mono text-[#00ff88]">{workout.targetPace}</span>
            <span className="text-gray-500 text-xs">per mile</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
