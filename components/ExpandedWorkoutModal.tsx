'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Play, MapPin, Gauge, X, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExpandedWorkoutModalProps {
  workout: any
  isOpen: boolean
  onClose: () => void
  onStartRun: () => void
}

export function ExpandedWorkoutModal({
  workout,
  isOpen,
  onClose,
  onStartRun,
}: ExpandedWorkoutModalProps) {
  if (!workout) return null

  const getWorkoutTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'tempo':
        return {
          bg: 'bg-orange-500/20',
          text: 'text-orange-400',
          border: 'border-orange-500/30',
        }
      case 'interval':
      case 'threshold':
        return {
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          border: 'border-red-500/30',
        }
      case 'long':
        return {
          bg: 'bg-blue-500/20',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
        }
      case 'easy':
        return {
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          border: 'border-green-500/30',
        }
      case 'recovery':
        return {
          bg: 'bg-purple-500/20',
          text: 'text-purple-400',
          border: 'border-purple-500/30',
        }
      default:
        return {
          bg: 'bg-gray-500/20',
          text: 'text-gray-400',
          border: 'border-gray-500/30',
        }
    }
  }

  const getWorkoutTypeLabel = (type: string) => {
    if (!type || type === 'rest') return 'Rest Day'
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const colors = getWorkoutTypeColor(workout.type)
  const isRest = workout.type === 'rest'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            onClick={onClose}
          />

          {/* Centered Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 300,
                duration: 0.4,
              }}
              className="bg-[#1a1a1a] rounded-3xl border-2 border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-xl transition-colors z-10"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>

              {/* Content */}
              <div className="p-8 md:p-12">
                {/* Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      'px-4 py-2 rounded-xl text-lg font-bold border',
                      colors.bg,
                      colors.text,
                      colors.border
                    )}>
                      {getWorkoutTypeLabel(workout.type)}
                    </div>
                    {!isRest && (
                      <div className="text-sm text-gray-400">
                        Week {workout.week} • Day {workout.day}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="w-5 h-5" />
                    <span className="text-lg">{formatDate(workout.date)}</span>
                  </div>
                </div>

                {!isRest && (
                  <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="bg-black rounded-xl p-6 border border-gray-800">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                          <MapPin className="w-5 h-5" />
                          <span className="text-sm">Distance</span>
                        </div>
                        <div className="text-4xl font-bold text-white">
                          {workout.distance || 0}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">miles</div>
                      </div>

                      {workout.targetPace && (
                        <div className="bg-black rounded-xl p-6 border border-gray-800">
                          <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Gauge className="w-5 h-5" />
                            <span className="text-sm">Target Pace</span>
                          </div>
                          <div className="text-4xl font-bold font-mono text-[#00ff88]">
                            {workout.targetPace}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">per mile</div>
                        </div>
                      )}
                    </div>

                    {/* Coach's Instructions / Description */}
                    {(workout.description || workout.coachNotes) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8 p-6 bg-black rounded-xl border border-gray-800"
                      >
                        <h3 className="text-lg font-bold text-[#00ff88] mb-3">
                          Coach's Instructions
                        </h3>
                        <p className="text-base text-gray-300 leading-relaxed whitespace-pre-line">
                          {workout.coachNotes || workout.description}
                        </p>
                      </motion.div>
                    )}

                    {/* START RUN Button */}
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      onClick={onStartRun}
                      className="w-full py-6 px-8 bg-[#00ff88] text-black rounded-2xl font-bold text-xl hover:bg-[#00e677] transition-all flex items-center justify-center gap-4 shadow-lg shadow-[#00ff88]/30 hover:shadow-[#00ff88]/50"
                    >
                      <Play className="w-7 h-7" />
                      START RUN
                    </motion.button>
                  </>
                )}

                {isRest && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">😴</div>
                    <h3 className="text-2xl font-bold mb-2">Rest Day</h3>
                    <p className="text-gray-400">
                      Take it easy today. Recovery is part of the plan.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
