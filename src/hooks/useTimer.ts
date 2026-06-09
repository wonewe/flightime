import { useState, useRef, useCallback, useEffect } from 'react'
import { PHASE_THRESHOLDS } from '../constants'
import type { FlightPhase } from '../types'

interface TimerState {
  elapsedMs: number
  progress: number
  phase: FlightPhase
  remainingMs: number
  isRunning: boolean
}

function getPhase(progress: number): FlightPhase {
  if (progress >= PHASE_THRESHOLDS.landed) return 'landed'
  if (progress >= PHASE_THRESHOLDS.descending) return 'descending'
  if (progress >= PHASE_THRESHOLDS.cruising) return 'cruising'
  return 'taxiing'
}

export function useTimer(durationMinutes: number) {
  const totalMs = durationMinutes * 60 * 1000
  const startTimeRef = useRef<number | null>(null)
  const accumulatedRef = useRef(0)
  const rafRef = useRef<number>(0)

  const [state, setState] = useState<TimerState>({
    elapsedMs: 0,
    progress: 0,
    phase: 'taxiing',
    remainingMs: totalMs,
    isRunning: false,
  })

  const tick = useCallback(() => {
    if (!startTimeRef.current) return

    const elapsed = accumulatedRef.current + (Date.now() - startTimeRef.current)
    const progress = Math.min(elapsed / totalMs, 1)
    const phase = getPhase(progress)

    setState({
      elapsedMs: elapsed,
      progress,
      phase,
      remainingMs: Math.max(totalMs - elapsed, 0),
      isRunning: progress < 1,
    })

    if (progress < 1) {
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [totalMs])

  const start = useCallback(() => {
    accumulatedRef.current = 0
    startTimeRef.current = Date.now()
    setState(prev => ({ ...prev, isRunning: true }))
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const pause = useCallback(() => {
    if (!startTimeRef.current) return
    cancelAnimationFrame(rafRef.current)
    accumulatedRef.current += Date.now() - startTimeRef.current
    startTimeRef.current = null
    setState(prev => ({ ...prev, isRunning: false }))
  }, [])

  const resume = useCallback(() => {
    if (startTimeRef.current) return // already running
    startTimeRef.current = Date.now()
    setState(prev => ({ ...prev, isRunning: true }))
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    startTimeRef.current = null
    accumulatedRef.current = 0
    setState(prev => ({ ...prev, isRunning: false }))
  }, [])

  useEffect(() => {
    return () => { cancelAnimationFrame(rafRef.current) }
  }, [])

  return { ...state, start, stop, pause, resume, totalMs }
}
