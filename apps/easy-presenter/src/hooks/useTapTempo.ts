import { useState, useRef, useCallback } from 'react'

export interface TapTempoControls {
  bpm: number
  setBpm: (bpm: number) => void
  currentBeat: number   // monotonic, increments every beat
  tapCount: number      // 0-3 — M32 style indicator
  isRunning: boolean
  tap: () => void       // M32: 3-tap window, 2 s timeout
  start: () => void
  stop: () => void
  reset: () => void
}

const M32_WINDOW      = 3     // exactly 3 taps like Midas M32
const TAP_TIMEOUT_MS  = 2000  // reset tap chain if gap > 2 s

export function useTapTempo(): TapTempoControls {
  const [bpm, _setBpm]           = useState(120)
  const [tapCount, setTapCount]  = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)

  // Scheduler ref — no re-renders, drift-corrected
  const sch = useRef({
    timeoutId:    null as ReturnType<typeof setTimeout> | null,
    nextBeatTime: 0,
    bpm:          120,
    beat:         0,
    running:      false,
  })

  const taps = useRef<number[]>([])

  // Tick stored in ref — always reads fresh sch without stale closure
  const tickRef = useRef<() => void>(() => {})
  tickRef.current = () => {
    const s = sch.current
    if (!s.running) return
    s.beat++
    setCurrentBeat(s.beat)
    s.nextBeatTime += 60_000 / s.bpm
    const delay = Math.max(4, s.nextBeatTime - Date.now())
    s.timeoutId = setTimeout(() => tickRef.current(), delay)
  }

  const setBpm = useCallback((v: number) => {
    const clamped = Math.max(40, Math.min(240, Math.round(v)))
    _setBpm(clamped)
    sch.current.bpm = clamped
  }, [])

  const start = useCallback(() => {
    const s = sch.current
    if (s.running) return
    s.running      = true
    s.nextBeatTime = Date.now() + 60_000 / s.bpm
    s.timeoutId    = setTimeout(() => tickRef.current(), 60_000 / s.bpm)
    setIsRunning(true)
  }, [])

  const stop = useCallback(() => {
    const s = sch.current
    s.running = false
    if (s.timeoutId !== null) { clearTimeout(s.timeoutId); s.timeoutId = null }
    setIsRunning(false)
  }, [])

  const reset = useCallback(() => {
    const s = sch.current
    s.running = false
    if (s.timeoutId !== null) { clearTimeout(s.timeoutId); s.timeoutId = null }
    s.beat = 0
    taps.current = []
    setIsRunning(false)
    setCurrentBeat(0)
    setTapCount(0)
  }, [])

  // ── M32-style tap ──
  // 3-tap sliding window · 2 s timeout · re-syncs phase on each tap
  const tap = useCallback(() => {
    const now = Date.now()

    // Timeout: if gap > 2 s, start fresh
    if (taps.current.length > 0 && now - taps.current[taps.current.length - 1]! > TAP_TIMEOUT_MS) {
      taps.current = []
    }

    taps.current.push(now)
    if (taps.current.length > M32_WINDOW) taps.current.shift() // keep last 3

    const count = taps.current.length
    setTapCount(count >= M32_WINDOW ? M32_WINDOW : count)

    // Need ≥ 2 taps to calculate
    if (count >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < taps.current.length; i++) {
        intervals.push(taps.current[i]! - taps.current[i - 1]!)
      }
      const avg    = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const newBpm = Math.round(60_000 / avg)
      if (newBpm >= 40 && newBpm <= 240) {
        _setBpm(newBpm)
        sch.current.bpm = newBpm
      }
    }

    // Re-sync phase to this tap — clears pending timeout, reschedules
    const s = sch.current
    if (s.timeoutId !== null) clearTimeout(s.timeoutId)
    s.running      = true
    s.nextBeatTime = now + 60_000 / s.bpm
    s.timeoutId    = setTimeout(() => tickRef.current(), 60_000 / s.bpm)
    setIsRunning(true)
  }, [])

  return { bpm, setBpm, currentBeat, tapCount, isRunning, tap, start, stop, reset }
}
