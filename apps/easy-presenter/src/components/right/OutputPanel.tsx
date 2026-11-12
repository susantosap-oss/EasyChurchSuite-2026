'use client'

import { SlideCanvas } from '../shared/SlideCanvas'
import type { Slide, SlideBackground, TextStyle } from '../types'

interface Props {
  liveSlide: Slide | null
  isBlank: boolean
  isLive: boolean
  background: SlideBackground
  textStyle: TextStyle
  liveMediaUrl?: string
  liveMediaType?: 'image' | 'video' | 'pdf'
  onNext: () => void
  onPrev: () => void
  onBlank: () => void
  onGoLive: () => void
}

export function OutputPanel({
  liveSlide, isBlank, isLive, background, textStyle,
  liveMediaUrl, liveMediaType,
  onNext, onPrev, onBlank, onGoLive,
}: Props) {
  const showMedia = isLive && !isBlank && liveMediaUrl && liveMediaType

  return (
    <div className="flex flex-col flex-shrink-0">
      {/* 16:9 output preview */}
      <div className="p-2.5">
        <div
          className="relative w-full overflow-hidden rounded-lg"
          style={{
            paddingTop: '56.25%',
            background: '#000',
            border:     isLive && !isBlank ? '2px solid #dc2626' : '2px solid #2a3347',
            boxShadow:  isLive && !isBlank ? '0 0 16px rgba(220,38,38,0.2)' : 'none',
          }}
        >
          <div className="absolute inset-0 overflow-hidden">
            {isBlank ? (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <span className="text-xs" style={{ color: '#374151' }}>BLANK</span>
              </div>
            ) : showMedia && liveMediaType === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={liveMediaUrl} alt="" className="w-full h-full object-contain" style={{ background: '#000' }} />
            ) : showMedia && liveMediaType === 'video' ? (
              <video
                src={liveMediaUrl}
                className="w-full h-full object-contain"
                style={{ background: '#000' }}
                autoPlay
                muted={false}
              />
            ) : showMedia && liveMediaType === 'pdf' ? (
              <iframe
                src={liveMediaUrl}
                className="w-full h-full"
                style={{ border: 'none', background: '#1a1a1a' }}
                title="PDF Output"
              />
            ) : liveSlide ? (
              <SlideCanvas
                text={liveSlide.text}
                background={background}
                textStyle={textStyle}
                containerWidth={260}
              />
            ) : (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <span className="text-[10px]" style={{ color: '#1f2937' }}>Belum ada output</span>
              </div>
            )}
          </div>

          {/* Live dot indicator */}
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1" style={{ zIndex: 10 }}>
            {isLive && !isBlank ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-bold" style={{ color: '#fca5a5' }}>LIVE</span>
              </>
            ) : (
              <span className="text-[9px]" style={{ color: '#374151' }}>
                {isBlank ? 'BLANK' : 'OFFLINE'}
              </span>
            )}
          </div>

          {/* Media type badge */}
          {showMedia && (
            <div className="absolute bottom-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(168,85,247,0.8)', color: 'white', zIndex: 10 }}>
              {liveMediaType === 'video' ? '🎬 VIDEO' : liveMediaType === 'pdf' ? '📄 PDF' : '🖼 IMG'}
            </div>
          )}
        </div>
      </div>

      {/* Transport */}
      <div className="px-2.5 pb-1.5 flex gap-1.5">
        <button
          onClick={onPrev}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3347' }}
        >
          ◄ Prev
        </button>
        <button
          onClick={onBlank}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: isBlank ? '#854d0e' : '#1e2535',
            color:      isBlank ? '#fef3c7' : '#94a3b8',
            border:     `1px solid ${isBlank ? '#a16207' : '#2a3347'}`,
          }}
        >
          {isBlank ? '■ BLANK' : 'Blank'}
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3347' }}
        >
          Next ►
        </button>
      </div>

      {/* ON AIR / OFF AIR toggle */}
      <div className="px-2.5 pb-2.5">
        <button
          onClick={onGoLive}
          className="w-full py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          style={{
            background: isLive ? '#dc2626' : '#1d4ed8',
            color:      'white',
            border:     `1px solid ${isLive ? '#b91c1c' : '#1e40af'}`,
            boxShadow:  isLive ? '0 0 16px rgba(220,38,38,0.35)' : '0 0 10px rgba(29,78,216,0.2)',
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: isLive ? '#fca5a5' : '#93c5fd', animation: isLive ? 'pulse 1.5s infinite' : 'none' }}
          />
          {isLive ? '■ OFF AIR' : '● Go Live'}
        </button>
      </div>
    </div>
  )
}
