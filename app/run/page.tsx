/// <reference path="../types/web-apis.d.ts" />
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, Authenticated, Unauthenticated } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { SignInButton } from '@clerk/nextjs'
import { Heart, Gauge, MapPin, Square, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GPSPoint {
  latitude: number
  longitude: number
  timestamp: number
  altitude?: number
  accuracy?: number
}

interface HeartRateData {
  bpm: number
  timestamp: number
  zone: number
}

interface PaceSample {
  pace: number // seconds per mile
  timestamp: number
}

export default function RunPage() {
  return (
    <>
      <Authenticated>
        <RunTrackingContent />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Sign in to track your run</h1>
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-[#00ff88] text-black rounded-xl font-bold hover:bg-[#00e677] transition-colors">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
    </>
  )
}

function RunTrackingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentUser = useQuery(api.users.getCurrentUser)
  const saveLiveRun = useMutation(api.workouts.saveLiveRun)

  // Get workout ID from URL
  const workoutId = searchParams?.get('workoutId') || null

  // Fetch today's workout if workoutId provided
  const todaysWorkout = useQuery(
    api.plans.getTodaysWorkout,
    currentUser?._id ? { userId: currentUser._id } : 'skip'
  )

  // Determine workout parameters
  const workoutType = searchParams?.get('type') || todaysWorkout?.workout.type || 'easy'
  const targetDistance = searchParams?.get('distance')
    ? parseFloat(searchParams.get('distance')!)
    : todaysWorkout?.workout.distance || null
  const targetPace = searchParams?.get('targetPace') || todaysWorkout?.workout.targetPace || null
  const workoutWeek = searchParams?.get('week') || todaysWorkout?.week?.toString() || null
  const workoutDay = searchParams?.get('day') || todaysWorkout?.day?.toString() || null

  // Default to Zone 2 (Easy Run) if no target pace
  const defaultTargetPace = '9:00' // Default easy pace
  const effectiveTargetPace = targetPace || defaultTargetPace

  // Core state
  const [isTracking, setIsTracking] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isHRConnected, setIsHRConnected] = useState(false)
  const [wakeLockActive, setWakeLockActive] = useState(false)

  // Metrics
  const [currentHR, setCurrentHR] = useState<number | null>(null)
  const [currentPace, setCurrentPace] = useState<string>('--:--')
  const [smoothedPace, setSmoothedPace] = useState<string>('--:--')
  const [distance, setDistance] = useState(0) // miles
  const [elapsedTime, setElapsedTime] = useState(0) // seconds
  const [averagePace, setAveragePace] = useState<string>('--:--')

  // GPS and pace tracking
  const [gpsPoints, setGpsPoints] = useState<GPSPoint[]>([])
  const [heartRateData, setHeartRateData] = useState<HeartRateData[]>([])
  const [paceSamples, setPaceSamples] = useState<PaceSample[]>([])

  // Refs
  const startTimeRef = useRef<number | null>(null)
  const gpsWatchIdRef = useRef<number | null>(null)
  const hrDeviceRef = useRef<BluetoothDevice | null>(null)
  const hrCharacteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const lastGPSPointRef = useRef<GPSPoint | null>(null)
  const lastMileRef = useRef(0)
  const lastKilometerRef = useRef(0)
  const lastPaceAlertRef = useRef(0)
  const lastHRWarningRef = useRef(0)
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate heart rate zone (1-5)
  const getHRZone = useCallback((bpm: number): number => {
    const maxHR = 190 // Simplified - could be user-specific
    const percentage = (bpm / maxHR) * 100

    if (percentage < 50) return 1 // Recovery
    if (percentage < 60) return 2 // Aerobic
    if (percentage < 70) return 3 // Tempo
    if (percentage < 80) return 4 // Threshold
    return 5 // VO2 Max
  }, [])

  // Haversine distance formula (meters)
  const haversineDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371000 // Earth radius in meters
      const dLat = ((lat2 - lat1) * Math.PI) / 180
      const dLon = ((lon2 - lon1) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    },
    []
  )

  // Convert pace string (MM:SS) to seconds per mile
  const paceToSeconds = useCallback((pace: string): number | null => {
    if (!pace || pace === '--:--') return null
    const [mins, secs] = pace.split(':').map(Number)
    return mins * 60 + secs
  }, [])

  // Convert seconds per mile to MM:SS format
  const secondsToPace = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Calculate pace smoothing (moving average of last 10 seconds)
  const calculateSmoothedPace = useCallback(() => {
    const now = Date.now()
    const tenSecondsAgo = now - 10000

    // Filter pace samples from last 10 seconds
    const recentSamples = paceSamples.filter((sample) => sample.timestamp > tenSecondsAgo)

    if (recentSamples.length === 0) {
      return null
    }

    // Calculate average pace
    const avgPace = recentSamples.reduce((sum, sample) => sum + sample.pace, 0) / recentSamples.length
    return avgPace
  }, [paceSamples])

  // Request wake lock
  const requestWakeLock = async () => {
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported')
      return
    }

    try {
      const wakeLock = await (navigator as any).wakeLock.request('screen')
      wakeLockRef.current = wakeLock
      setWakeLockActive(true)

      wakeLock.addEventListener('release', () => {
        setWakeLockActive(false)
      })
    } catch (err) {
      console.warn('Wake Lock request failed:', err)
    }
  }

  // Release wake lock
  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release()
      wakeLockRef.current = null
      setWakeLockActive(false)
    }
  }

  // Connect to heart rate monitor via Web Bluetooth
  const connectHRMonitor = async () => {
    if (!navigator.bluetooth) {
      alert('Web Bluetooth is not supported on this device')
      return
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service'],
      })

      hrDeviceRef.current = device

      device.addEventListener('gattserverdisconnected', () => {
        setIsHRConnected(false)
        setCurrentHR(null)
      })

      const server = await device.gatt?.connect()
      const service = await server?.getPrimaryService('heart_rate')
      const characteristic = await service?.getCharacteristic('heart_rate_measurement')

      hrCharacteristicRef.current = characteristic || null

      if (characteristic) {
        await characteristic.startNotifications()

        characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
          const value = event.target.value
          const flags = value.getUint8(0)
          let bpm: number

          if (flags & 0x01) {
            bpm = value.getUint16(1, true)
          } else {
            bpm = value.getUint8(1)
          }

          setCurrentHR(bpm)
          setHeartRateData((prev) => [
            ...prev,
            {
              bpm,
              timestamp: Date.now(),
              zone: getHRZone(bpm),
            },
          ])
        })

        setIsHRConnected(true)
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        console.error('Bluetooth connection error:', err)
        alert('Failed to connect to heart rate monitor')
      }
    }
  }

  // Disconnect HR monitor
  const disconnectHRMonitor = async () => {
    if (hrDeviceRef.current?.gatt?.connected) {
      hrDeviceRef.current.gatt.disconnect()
    }
    setIsHRConnected(false)
    setCurrentHR(null)
    hrDeviceRef.current = null
    hrCharacteristicRef.current = null
  }

  // Speech synthesis
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported')
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 0.9
    window.speechSynthesis.speak(utterance)
  }, [])

  // GPS tracking with pace calculation
  useEffect(() => {
    if (!isTracking) {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current)
        gpsWatchIdRef.current = null
      }
      return
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    }

    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const gpsPoint: GPSPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
          altitude: position.coords.altitude || undefined,
          accuracy: position.coords.accuracy || undefined,
        }

        setGpsPoints((prev) => [...prev, gpsPoint])

        // Calculate distance
        if (lastGPSPointRef.current) {
          const dist = haversineDistance(
            lastGPSPointRef.current.latitude,
            lastGPSPointRef.current.longitude,
            gpsPoint.latitude,
            gpsPoint.longitude
          )
          const distMiles = dist / 1609.34
          setDistance((prev) => prev + distMiles)
        }

        // Calculate current pace from last two points
        if (lastGPSPointRef.current) {
          const timeDiff = (gpsPoint.timestamp - lastGPSPointRef.current.timestamp) / 1000 // seconds
          const distMiles = haversineDistance(
            lastGPSPointRef.current.latitude,
            lastGPSPointRef.current.longitude,
            gpsPoint.latitude,
            gpsPoint.longitude
          ) / 1609.34

          if (timeDiff > 0 && distMiles > 0) {
            const paceSecondsPerMile = timeDiff / distMiles

            // Add to pace samples for smoothing
            setPaceSamples((prev) => [
              ...prev,
              { pace: paceSecondsPerMile, timestamp: gpsPoint.timestamp },
            ])

            // Update current pace immediately
            setCurrentPace(secondsToPace(paceSecondsPerMile))
          }
        }

        lastGPSPointRef.current = gpsPoint
      },
      (error) => {
        console.error('GPS error:', error)
      },
      options
    )
  }, [isTracking, haversineDistance, secondsToPace])

  // Pace smoothing (update every second)
  useEffect(() => {
    if (!isTracking) return

    const smoothingInterval = setInterval(() => {
      const smoothed = calculateSmoothedPace()
      if (smoothed !== null) {
        setSmoothedPace(secondsToPace(smoothed))
      }
    }, 1000)

    return () => clearInterval(smoothingInterval)
  }, [isTracking, calculateSmoothedPace, secondsToPace])

  // Calculate average pace
  useEffect(() => {
    if (!isTracking || distance === 0 || elapsedTime === 0) {
      setAveragePace('--:--')
      return
    }

    const paceSecondsPerMile = elapsedTime / distance
    setAveragePace(secondsToPace(paceSecondsPerMile))
  }, [isTracking, distance, elapsedTime, secondsToPace])

  // Update elapsed time
  useEffect(() => {
    if (!isTracking) {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current)
      }
      return
    }

    timeIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setElapsedTime(elapsed)
      }
    }, 1000)

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current)
      }
    }
  }, [isTracking])

  // Audio coaching
  useEffect(() => {
    if (!isAudioEnabled || !isTracking) return

    const now = Date.now()

    // Milestone alerts - Every 1 km or 1 mile
    const currentKm = Math.floor(distance * 1.60934)
    const currentMile = Math.floor(distance)

    // Kilometer milestone
    if (currentKm > lastKilometerRef.current && currentKm > 0) {
      const pace = averagePace !== '--:--' ? averagePace : smoothedPace
      speak(`${currentKm} kilometer${currentKm > 1 ? 's' : ''} completed. Average pace ${pace} per mile.`)
      lastKilometerRef.current = currentKm
    }

    // Mile milestone
    if (currentMile > lastMileRef.current && currentMile > 0) {
      const pace = averagePace !== '--:--' ? averagePace : smoothedPace
      speak(`${currentMile} mile${currentMile > 1 ? 's' : ''} completed. Average pace ${pace} per mile.`)
      lastMileRef.current = currentMile
    }

    // Pace alerts - Check every 30 seconds
    if (effectiveTargetPace && smoothedPace !== '--:--' && now - lastPaceAlertRef.current > 30000) {
      const currentPaceSecs = paceToSeconds(smoothedPace)
      const targetPaceSecs = paceToSeconds(effectiveTargetPace)

      if (currentPaceSecs !== null && targetPaceSecs !== null) {
        const paceDiff = targetPaceSecs - currentPaceSecs // Positive = faster than target

        if (paceDiff > 20) {
          // More than 20 seconds faster (ahead of pace)
          speak('You are ahead of pace. Slow down.')
          lastPaceAlertRef.current = now
        } else if (paceDiff < -20) {
          // More than 20 seconds slower (behind pace)
          speak('Pick up the pace.')
          lastPaceAlertRef.current = now
        }
      }
    }

    // Heart rate alerts - Check every 30 seconds
    if (currentHR && now - lastHRWarningRef.current > 30000) {
      const zone = getHRZone(currentHR)
      // Alert if HR is too high (Zone 4 or 5)
      if (zone >= 4) {
        speak('Heart rate too high. Breathe and slow down.')
        lastHRWarningRef.current = now
      }
    }
  }, [
    isAudioEnabled,
    isTracking,
    distance,
    averagePace,
    smoothedPace,
    effectiveTargetPace,
    currentHR,
    paceToSeconds,
    getHRZone,
    speak,
  ])

  const handleStart = async () => {
    setIsTracking(true)
    startTimeRef.current = Date.now()
    setDistance(0)
    setElapsedTime(0)
    setCurrentPace('--:--')
    setSmoothedPace('--:--')
    setAveragePace('--:--')
    setGpsPoints([])
    setHeartRateData([])
    setPaceSamples([])
    lastGPSPointRef.current = null
    lastMileRef.current = 0
    lastKilometerRef.current = 0
    lastPaceAlertRef.current = 0
    lastHRWarningRef.current = 0

    await requestWakeLock()
  }

  const handleFinish = async () => {
    if (!isTracking) return

    setIsTracking(false)
    const endTime = Date.now()
    const duration = startTimeRef.current ? Math.floor((endTime - startTimeRef.current) / 1000) : 0

    // Calculate averages
    const hrData = heartRateData
    const avgHR = hrData.length > 0 ? hrData.reduce((sum, d) => sum + d.bpm, 0) / hrData.length : null
    const maxHR = hrData.length > 0 ? Math.max(...hrData.map((d) => d.bpm)) : null

    // Use average pace or smoothed pace
    const finalPace = averagePace !== '--:--' ? averagePace : smoothedPace !== '--:--' ? smoothedPace : '0:00'

    // Save to Convex
    try {
      await saveLiveRun({
        startTime: startTimeRef.current || Date.now(),
        endTime,
        duration,
        totalDistance: distance,
        averagePace: finalPace,
        maxHeartRate: maxHR || undefined,
        averageHeartRate: avgHR || undefined,
        gpsPoints,
        heartRateData: hrData,
      })

      // Navigate back to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to save run:', error)
      alert('Failed to save run data. Please try again.')
    }

    // Cleanup
    if (gpsWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current)
      gpsWatchIdRef.current = null
    }

    await releaseWakeLock()
    window.speechSynthesis.cancel()

    startTimeRef.current = null
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Show loading state
  if (currentUser === undefined) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ff88] mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset">
      {/* Top Controls Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <button
          onClick={() => setIsAudioEnabled(!isAudioEnabled)}
          className={cn(
            'p-2 rounded-lg transition-all',
            isAudioEnabled
              ? 'bg-[#00ff88]/20 text-[#00ff88]'
              : 'bg-gray-900/50 text-gray-400'
          )}
        >
          {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        {wakeLockActive && (
          <div className="flex items-center gap-2 text-[#00ff88] text-xs">
            <span>Screen On</span>
          </div>
        )}

        <button
          onClick={isHRConnected ? disconnectHRMonitor : connectHRMonitor}
          className={cn(
            'p-2 rounded-lg transition-all',
            isHRConnected
              ? 'bg-[#00ff88]/20 text-[#00ff88]'
              : 'bg-gray-900/50 text-gray-400'
          )}
        >
          <Heart className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content - Full Screen Split */}
      <div className="flex flex-col h-screen">
        {/* Top Half - Current Pace */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">Current Pace</div>
            <div className="text-8xl md:text-9xl font-bold font-mono text-white mb-2">
              {smoothedPace !== '--:--' ? smoothedPace : currentPace}
            </div>
            <div className="text-lg text-gray-400">per mile</div>
            {effectiveTargetPace && (
              <div className="mt-4 text-sm text-gray-500">
                Target: {effectiveTargetPace}/mile
              </div>
            )}
          </div>
        </div>

        {/* Bottom Half - Heart Rate and Distance */}
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-2 gap-8 w-full max-w-md px-8">
            {/* Heart Rate */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-[#00ff88]" />
                <span className="text-sm text-gray-400">Heart Rate</span>
              </div>
              <div className="text-5xl md:text-6xl font-bold text-white mb-1">
                {currentHR || '--'}
              </div>
              <div className="text-sm text-gray-500">bpm</div>
            </div>

            {/* Distance */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-[#00ff88]" />
                <span className="text-sm text-gray-400">Distance</span>
              </div>
              <div className="text-5xl md:text-6xl font-bold text-white mb-1">
                {distance.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">miles</div>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Time and Controls */}
        <div className="pb-8 px-4">
          {/* Elapsed Time */}
          <div className="text-center mb-6">
            <div className="text-3xl font-bold font-mono text-white">{formatTime(elapsedTime)}</div>
            <div className="text-xs text-gray-400 mt-1">Elapsed Time</div>
          </div>

          {/* Start/Finish Button */}
          {!isTracking ? (
            <button
              onClick={handleStart}
              className="w-full py-6 bg-[#00ff88] text-black rounded-2xl font-bold text-xl hover:bg-[#00e677] transition-all"
            >
              Start Run
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="w-full py-6 bg-red-600 text-white rounded-2xl font-bold text-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2"
            >
              <Square className="w-6 h-6" />
              Finish Run
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
