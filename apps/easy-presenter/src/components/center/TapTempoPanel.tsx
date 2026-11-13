'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Slide, SlideBackground, TextStyle } from '../types'
import { SlideCanvas } from '../shared/SlideCanvas'

const BEATS_PER_SLIDE_OPTIONS = [1, 2, 4, 8, 16]

interface Props {
  slides: Slide[]
  activeSlideId: string
  liveSlideId: string | null
  background: SlideBackground
  textStyle: TextStyle
  bpm: number
  setBpm: (bpm: number) => void
  currentBeat: number
  tapCount: number
  isRunning: boolean
  tap: () => void
  stop: () => void
  reset: () => void
  beatsPerSlide: number
  setBeatsPerSlide: (n: number) => void
  isSongLive: boolean
  onSelectSlide: (id: string) => void   // preview-only (beat advance when not live)
  onGoLiveSlide: (id: string) => void   // go live (beat advance when live)
}

export function TapTempoPanel({
  slides, activeSlideId, liveSlideId, background, textStyle,
  bpm, setBpm, currentBeat, tapCount, isRunning,
  tap, stop, reset, beatsPerSlide, setBeatsPerSlide,
  isSongLive, onSelectSlide, onGoLiveSlide,
}: Props) {
  const [mode, setMode]               = useState<'auto' | 'manual'>('manual')
  const [inJeda, setInJeda]           = useState(false)
  const [phaseDisplay, setPhaseDisplay] = useState(0)

  // Refs for logic (no re-renders)
  const beatCountRef      = useRef(0)
  const prevSlideRef      = useRef(activeSlideId)
  const inJedaRef         = useRef(false)
  const jedaRemRef        = useRef(0)
  const dotRef            = useRef<HTMLDivElement>(null)
  const lyricsRef         = useRef<HTMLDivElement>(null)
  // Keep latest callbacks/values in refs so beat effect never has a stale closure
  const onSelectSlideRef  = useRef(onSelectSlide)
  const onGoLiveSlideRef  = useRef(onGoLiveSlide)
  const isSongLiveRef     = useRef(isSongLive)
  useEffect(() => { onSelectSlideRef.current = onSelectSlide }, [onSelectSlide])
  useEffect(() => { onGoLiveSlideRef.current = onGoLiveSlide }, [onGoLiveSlide])
  useEffect(() => { isSongLiveRef.current = isSongLive }, [isSongLive])

  // Manual slide change → reset phrase + jeda state
  useEffect(() => {
    if (prevSlideRef.current !== activeSlideId) {
      prevSlideRef.current = activeSlideId
      beatCountRef.current = 0
      setPhaseDisplay(0)
      inJedaRef.current = false
      jedaRemRef.current = 0
      setInJeda(false)
      if (isRunning) setMode('manual')
    }
  }, [activeSlideId, isRunning])

  // Beat tick — WAAPI animations + auto-advance + per-slide jeda
  useEffect(() => {
    if (!isRunning || currentBeat === 0) return

    // Dot pulse (compositor thread)
    dotRef.current?.animate(
      [
        { transform: 'scale(1)',   background: '#3b82f6' },
        { transform: 'scale(1.8)', background: '#93c5fd' },
        { transform: 'scale(1)',   background: '#3b82f6' },
      ],
      { duration: 160, easing: 'ease-out', fill: 'none' }
    )

    // Lyric monitor pulse (compositor thread)
    if (lyricsRef.current) {
      const beatMs = 60_000 / bpm
      lyricsRef.current.animate(
        [
          { transform: 'scale(1)',     opacity: '0.9'  },
          { transform: 'scale(1.015)', opacity: '1'    },
          { transform: 'scale(1)',     opacity: '0.93' },
        ],
        { duration: Math.min(beatMs * 0.72, 350), easing: 'cubic-bezier(0.25,0.46,0.45,0.94)', fill: 'none' }
      )
    }

    // Jeda countdown — tick down, advance when done
    if (inJedaRef.current) {
      jedaRemRef.current--
      if (jedaRemRef.current <= 0) {
        inJedaRef.current = false
        setInJeda(false)
        const idx  = slides.findIndex(s => s.id === activeSlideId)
        const next = slides[idx + 1]
        if (next) {
          beatCountRef.current = 0
          setPhaseDisplay(0)
          setMode('auto')
          if (isSongLiveRef.current) onGoLiveSlideRef.current(next.id)
          else onSelectSlideRef.current(next.id)
        } else {
          // Slide terakhir — tempo tetap hidup, operator bisa kembali ke slide manapun
          beatCountRef.current = 0
          setPhaseDisplay(0)
          setMode('manual')
        }
      }
      return
    }

    // Normal beat count
    beatCountRef.current++
    setPhaseDisplay(beatCountRef.current % beatsPerSlide)

    if (beatCountRef.current >= beatsPerSlide) {
      beatCountRef.current = 0
      setPhaseDisplay(0)
      const idx      = slides.findIndex(s => s.id === activeSlideId)
      const curr     = slides[idx]
      const next     = slides[idx + 1]

      if (next) {
        // Check per-slide jeda (jedaBars × beatsPerSlide = total beats to wait)
        const jedaBeats = (curr?.jedaBars ?? 0) * beatsPerSlide
        if (jedaBeats > 0) {
          inJedaRef.current  = true
          jedaRemRef.current = jedaBeats
          setInJeda(true)
          return
        }
        setMode('auto')
        if (isSongLiveRef.current) onGoLiveSlideRef.current(next.id)
        else onSelectSlideRef.current(next.id)
      } else {
        // Slide terakhir — tempo tetap hidup, operator bisa kembali ke slide manapun
        beatCountRef.current = 0
        setPhaseDisplay(0)
        setMode('manual')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBeat])

  // Keyboard shortcut: T = tap
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 't') return
      const tag = (e.target as HTMLElement | null)?.tagName ?? ''
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      e.preventDefault()
      tap()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [tap])

  const handleStop = useCallback(() => {
    stop()
    reset()
    inJedaRef.current = false
    jedaRemRef.current = 0
    setInJeda(false)
    beatCountRef.current = 0
    setPhaseDisplay(0)
    setMode('manual')
  }, [stop, reset])

  const beatMs = Math.round(60_000 / bpm)

  // Resolve active slide for right-frame preview
  const previewSlide = slides.find(s => s.id === activeSlideId) ?? slides[0]
  const resolvedBg   = previewSlide?.backgroundOverride ?? background
  const resolvedTs   = previewSlide?.textStyleOverride
    ? { ...textStyle, ...previewSlide.textStyleOverride }
    : textStyle

  // Mode badge
  const modeLabel = inJeda ? '⏸ JEDA' : mode === 'auto' ? '⟳ AUTO' : '✋ MANUAL'
  const modeBg    = inJeda ? '#422006' : mode === 'auto' ? '#14532d' : '#1e3a5f'
  const modeColor = inJeda ? '#fb923c' : mode === 'auto' ? '#86efac' : '#93c5fd'

  return (
    <div
      className="flex-1 min-h-0 select-none flex"
      style={{ background: '#080c14' }}
    >
      {/* ── LEFT FRAME: controls ───────────────────────────────────────── */}
      <div
        className="flex flex-col gap-1.5"
        style={{
          width:        228,
          flexShrink:   0,
          borderRight:  '1px solid #2a3347',
          padding:      '8px 10px 10px',
          overflowY:    'auto',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-1.5">
          <div
            ref={dotRef}
            className="rounded-full flex-shrink-0"
            style={{
              width:      8,
              height:     8,
              background: isRunning ? '#3b82f6' : '#1e2535',
              border:     '1px solid #2a3347',
              willChange: 'transform',
            }}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#ffffff' }}>
            Tap Tempo
          </span>
          {isRunning && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: modeBg, color: modeColor }}>
              {modeLabel}
            </span>
          )}
          <span className="text-[9px] ml-auto" style={{ color: '#2d3748' }}>T</span>
        </div>

        {/* M32 3-dot tap indicator */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width:      i < tapCount ? 10 : 6,
                height:     i < tapCount ? 10 : 6,
                background: i < tapCount ? '#3b82f6' : '#1e2535',
                border:     `1px solid ${i < tapCount ? '#2563eb' : '#2a3347'}`,
                transition: 'all 0.08s',
              }}
            />
          ))}
          <span className="text-[8px] ml-1" style={{ color: '#2d3748' }}>M32</span>
        </div>

        {/* TAP + BPM row */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={tap}
            className="flex-shrink-0 rounded-lg font-black active:scale-95 transition-transform"
            style={{
              width:      54,
              height:     42,
              background: isRunning ? '#1d4ed8' : '#1e2535',
              color:      isRunning ? '#fff'    : '#94a3b8',
              border:     `2px solid ${isRunning ? '#2563eb' : '#2a3347'}`,
              fontSize:   12,
              boxShadow:  isRunning ? '0 0 12px rgba(29,78,216,0.35)' : 'none',
            }}
          >TAP</button>

          <div className="flex flex-col flex-1 gap-0.5">
            <div className="flex items-center gap-1.5">
              <input
                type="number" min={40} max={240}
                value={bpm}
                onChange={e => setBpm(Number(e.target.value))}
                className="w-11 px-1 py-0.5 rounded font-mono font-bold text-center focus:outline-none"
                style={{ background: '#0f1117', border: '1px solid #2a3347', color: '#f1f5f9', fontSize: 15 }}
              />
              <div className="text-[9px] flex flex-col leading-tight" style={{ color: '#374151' }}>
                <span>BPM</span>
                <span>{beatMs}ms</span>
              </div>
              {isRunning && (
                <button
                  onClick={handleStop}
                  className="ml-auto text-[10px] px-2 py-0.5 rounded font-semibold"
                  style={{ background: '#3b1515', color: '#fca5a5', border: '1px solid #5b2020' }}
                >■ Stop</button>
              )}
            </div>
            <input
              type="range" min={40} max={200} step={1}
              value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: '#3b82f6', height: 4 }}
            />
          </div>
        </div>

        {/* beats/slide */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[9px]" style={{ color: '#475569' }}>beat/slide:</span>
          {BEATS_PER_SLIDE_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => setBeatsPerSlide(n)}
              className="text-[9px] rounded px-1.5 py-0.5 font-mono"
              style={{
                background: beatsPerSlide === n ? '#1d4ed8' : '#1e2535',
                color:      beatsPerSlide === n ? '#fff'    : '#475569',
                border:     `1px solid ${beatsPerSlide === n ? '#2563eb' : '#2a3347'}`,
              }}
            >{n}</button>
          ))}
        </div>

        {/* Beat progress bar */}
        {isRunning && beatsPerSlide > 1 && (
          <div className="flex gap-0.5">
            {Array.from({ length: beatsPerSlide }, (_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full"
                style={{
                  height:     3,
                  background: inJeda
                    ? '#78350f'
                    : i < phaseDisplay  ? '#3b82f6'
                    : i === phaseDisplay ? '#93c5fd'
                    : '#1e2535',
                  opacity:    i <= phaseDisplay || inJeda ? 1 : 0.35,
                  transition: 'background 0.05s',
                }}
              />
            ))}
          </div>
        )}

        {/* Jeda hint */}
        <p className="text-[8px] leading-relaxed" style={{ color: '#2d3748' }}>
          Jeda antar slide: set di panel slide (klik + jeda)
        </p>
      </div>

      {/* ── RIGHT FRAME: live monitor ──────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ padding: '8px 8px 8px 10px', minWidth: 0 }}
      >
        {/* Monitor header */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#ffffff' }}>Monitor</span>
          {previewSlide && (
            <span className="text-[9px] px-1.5 py-0.5 rounded truncate"
              style={{ background: '#1e2535', color: '#64748b', maxWidth: 120 }}>
              {previewSlide.label}
            </span>
          )}
          {previewSlide?.jedaBars ? (
            <span className="text-[9px] px-1 rounded" style={{ color: '#fb923c' }}>
              ⏸{previewSlide.jedaBars}bar
            </span>
          ) : null}
          {liveSlideId === activeSlideId && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
              style={{ background: '#14532d', color: '#86efac' }}>● LIVE</span>
          )}
          {inJeda && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
              style={{ background: '#422006', color: '#fb923c' }}>
              ⏸ {jedaRemRef.current}b
            </span>
          )}
        </div>

        {/* SlideCanvas preview with WAAPI beat animation */}
        <div
          ref={lyricsRef}
          className="flex-1 rounded-lg overflow-hidden relative"
          style={{ willChange: 'transform', minHeight: 0 }}
        >
          {previewSlide ? (
            <SlideCanvas
              text={previewSlide.text}
              background={resolvedBg}
              textStyle={resolvedTs}
              containerWidth={300}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: '#0a0f1a', borderRadius: 8 }}>
              <span className="text-xs" style={{ color: '#374151' }}>—</span>
            </div>
          )}
        </div>

        {/* Beat phase dots */}
        {isRunning && beatsPerSlide > 1 && (
          <div className="flex gap-1 justify-center mt-1 flex-shrink-0">
            {Array.from({ length: Math.min(beatsPerSlide, 16) }, (_, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width:      i === phaseDisplay ? 7 : 4,
                  height:     i === phaseDisplay ? 7 : 4,
                  background: inJeda
                    ? '#78350f'
                    : i < phaseDisplay  ? '#3b82f6'
                    : i === phaseDisplay ? '#93c5fd'
                    : '#1e2535',
                  transition: 'all 0.05s',
                }}
              />
            ))}
          </div>
        )}

        {/* Slide position indicator — read-only dots (no click handlers to avoid accidental Go Live) */}
        <div className="flex gap-0.5 mt-1 flex-shrink-0 overflow-x-auto">
          {slides.map((s, i) => (
            <div
              key={s.id}
              title={s.label}
              className="flex-shrink-0 text-[8px] rounded py-0.5 font-mono text-center"
              style={{
                width:      18,
                background: s.id === activeSlideId ? '#1d4ed8'
                           : s.id === liveSlideId   ? '#14532d'
                           : '#1e2535',
                color:      s.id === activeSlideId ? '#fff'
                           : s.id === liveSlideId   ? '#86efac'
                           : '#475569',
                border:     `1px solid ${s.id === activeSlideId ? '#2563eb' : 'transparent'}`,
              }}
            >{i + 1}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
