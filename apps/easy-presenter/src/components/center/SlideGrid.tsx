'use client'

import { SlideCanvas } from '../shared/SlideCanvas'
import type { Slide, SlideBackground, TextStyle } from '../types'

interface Props {
  slides: Slide[]
  activeSlideId: string
  liveSlideId: string | null
  background: SlideBackground
  textStyle: TextStyle
  onSelect: (id: string) => void
}

export function SlideGrid({ slides, activeSlideId, liveSlideId, background, textStyle, onSelect }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {slides.map((slide, idx) => {
          const isActive = slide.id === activeSlideId
          const isLive   = slide.id === liveSlideId

          // Resolve per-slide overrides
          const bg = slide.backgroundOverride ?? background
          const ts: TextStyle = slide.textStyleOverride
            ? { ...textStyle, ...slide.textStyleOverride }
            : textStyle

          return (
            <button
              key={slide.id}
              onClick={() => onSelect(slide.id)}
              className="text-left rounded-xl overflow-hidden transition-all"
              style={{
                border:     isActive ? '2px solid #3b82f6' : isLive ? '2px solid #dc2626' : '2px solid #2a3347',
                background: '#161b27',
                boxShadow:  isActive ? '0 0 0 3px rgba(59,130,246,0.15)' : isLive ? '0 0 0 3px rgba(220,38,38,0.15)' : 'none',
                transform:  isActive ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {/* 16:9 slide preview */}
              <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                <div className="absolute inset-0">
                  <SlideCanvas text={slide.text} background={bg} textStyle={ts} containerWidth={180} />
                </div>

                {/* Per-slide override indicator */}
                {(slide.backgroundOverride || slide.textStyleOverride) && (
                  <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full"
                    style={{ background: '#f59e0b', zIndex: 10 }} title="Override aktif" />
                )}

                {/* Live badge */}
                {isLive && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                    style={{ background: '#dc2626', color: 'white', zIndex: 10 }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                )}

                {/* Slide number */}
                <div className="absolute bottom-1.5 left-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#64748b', zIndex: 10 }}>
                  {idx + 1}
                </div>
              </div>

              {/* Label */}
              <div className="px-2.5 py-1.5 flex items-center gap-2" style={{ borderTop: '1px solid #2a3347' }}>
                <span className="text-[10px] font-medium truncate flex-1"
                  style={{ color: isActive ? '#93c5fd' : '#64748b' }}>
                  {slide.label}
                </span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#3b82f6' }} />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
