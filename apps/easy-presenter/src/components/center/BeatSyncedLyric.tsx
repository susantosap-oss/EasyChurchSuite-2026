'use client'

import { useRef, useEffect } from 'react'

interface Props {
  text: string
  label: string
  bpm: number
  currentBeat: number       // monotonic — changes trigger pulse animation
  beatsPerSlide: number
  slideIndex: number
  totalSlides: number
  onPrev: () => void
  onNext: () => void
}

/**
 * Displays the current slide lyric with a beat-synced pulse animation.
 * Animation runs entirely on the compositor thread (WAAPI) — zero JS overhead per frame.
 */
export function BeatSyncedLyric({
  text, label, bpm, currentBeat, beatsPerSlide,
  slideIndex, totalSlides, onPrev, onNext,
}: Props) {
  const textRef = useRef<HTMLDivElement>(null)
  const beatMs  = Math.round(60_000 / bpm)

  // Pulse on every beat using Web Animations API (compositor thread, not JS)
  useEffect(() => {
    if (!textRef.current || currentBeat === 0) return
    textRef.current.animate(
      [
        { transform: 'scale(1)',     opacity: 0.88, filter: 'brightness(0.9)' },
        { transform: 'scale(1.028)', opacity: 1,    filter: 'brightness(1.08)' },
        { transform: 'scale(1)',     opacity: 0.93, filter: 'brightness(0.95)' },
      ],
      {
        duration:   Math.min(Math.round(beatMs * 0.72), 380),
        easing:     'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill:       'none',
        composite:  'replace',
      }
    )
  }, [currentBeat, beatMs])

  // Beat progress dots: position within current phrase
  const beatInSlide = beatsPerSlide > 1 ? currentBeat % beatsPerSlide : 0
  const lines = text.split('\n')

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{ background: 'linear-gradient(180deg, #060a12 0%, #0a0f1a 100%)' }}
    >
      {/* Beat-progress dots */}
      <div className="flex gap-1.5 px-5 pt-3 pb-0 flex-shrink-0">
        {Array.from({ length: beatsPerSlide }, (_, i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-all"
            style={{
              height: i === beatInSlide ? 4 : 3,
              background: i < beatInSlide
                ? '#3b82f6'
                : i === beatInSlide
                  ? '#93c5fd'
                  : '#1e2535',
              opacity: i <= beatInSlide ? 1 : 0.4,
            }}
          />
        ))}
      </div>

      {/* Slide label */}
      <div className="px-5 pt-2 pb-0 flex-shrink-0 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#374151' }}>
          {label}
        </span>
        <span className="text-[10px] font-mono" style={{ color: '#374151' }}>
          {slideIndex + 1}/{totalSlides}
        </span>
      </div>

      {/* Main lyric text — pulse effect applied here */}
      <div className="flex-1 flex items-center justify-center px-6 overflow-hidden">
        <div
          ref={textRef}
          className="text-center leading-tight w-full"
          style={{
            color:      '#f8fafc',
            fontWeight: 600,
            fontSize:   'clamp(16px, 3vw, 32px)',
            textShadow: '0 0 32px rgba(59,130,246,0.25), 0 2px 12px rgba(0,0,0,0.8)',
            willChange: 'transform',   // hint to browser to promote to composited layer
          }}
        >
          {lines.map((line, i) => (
            <div key={i} style={{ lineHeight: 1.35 }}>{line || ' '}</div>
          ))}
        </div>
      </div>

      {/* Slide navigation */}
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-1 flex-shrink-0">
        <button
          onClick={onPrev}
          disabled={slideIndex === 0}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{
            background: '#1e2535',
            color: slideIndex === 0 ? '#374151' : '#94a3b8',
            border: '1px solid #2a3347',
          }}
        >◄ Prev</button>

        <div className="flex gap-1">
          {Array.from({ length: Math.min(totalSlides, 12) }, (_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: i === slideIndex ? 16 : 6,
                height: 4,
                background: i === slideIndex ? '#3b82f6' : '#1e2535',
                transition: 'width 0.15s ease',
              }}
            />
          ))}
        </div>

        <button
          onClick={onNext}
          disabled={slideIndex >= totalSlides - 1}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{
            background: '#1e2535',
            color: slideIndex >= totalSlides - 1 ? '#374151' : '#94a3b8',
            border: '1px solid #2a3347',
          }}
        >Next ►</button>
      </div>
    </div>
  )
}
