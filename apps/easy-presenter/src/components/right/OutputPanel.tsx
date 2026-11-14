'use client'

import { SlideCanvas } from '../shared/SlideCanvas'
import type { Slide, SlideBackground, TextStyle, MediaControl, MediaStatus } from '../types'
import { OutputVideo } from './OutputVideo'
import { RunningTextOverlay } from '../shared/RunningTextOverlay'
import type { RunningText } from '@/lib/outputBus'

/** Inner width of the 16:9 preview (300px panel − padding − border) */
const PREVIEW_W = 276

interface Props {
  liveSlide: Slide | null
  isBlank: boolean
  isLive: boolean
  background: SlideBackground
  textStyle: TextStyle
  liveMediaUrl?: string
  liveMediaType?: 'image' | 'video' | 'pdf'
  runningText: RunningText | null
  /** Display 1 chroma key colour (null = off) */
  chromaKey: string | null
  /** The live item is one of the keyed types */
  keyLive: boolean
  subtitle: boolean
  subtitleSize: number
  mediaControl: MediaControl
  onMediaStatus: (status: MediaStatus) => void
  onNext: () => void
  onPrev: () => void
  onBlank: () => void
  onGoLive: () => void
}

export function OutputPanel({
  liveSlide, isBlank, isLive, background, textStyle,
  liveMediaUrl, liveMediaType, runningText, chromaKey, keyLive, subtitle, subtitleSize, mediaControl, onMediaStatus,
  onNext, onPrev, onBlank, onGoLive,
}: Props) {
  const showMedia = isLive && !isBlank && liveMediaUrl && liveMediaType
  const idleColor = chromaKey ?? '#000'
  // Mirror what Display 1 sends: key colour instead of the slide background, text at the bottom
  const bg: SlideBackground = chromaKey && keyLive ? { type: 'solid', color: chromaKey } : background
  const style: TextStyle = chromaKey && keyLive && subtitle
    ? { ...textStyle, verticalPosition: 'bottom', fontSize: subtitleSize }
    : textStyle

  return (
    <div className="flex flex-col flex-shrink-0">
      {/* 16:9 output preview */}
      <div className="p-2.5">
        <div
          className="relative w-full overflow-hidden rounded-lg"
          style={{
            paddingTop: '56.25%',
            background: idleColor,
            border:     isLive && !isBlank ? '2px solid #dc2626' : '2px solid #2a3347',
            boxShadow:  isLive && !isBlank ? '0 0 16px rgba(220,38,38,0.2)' : 'none',
          }}
        >
          <div className="absolute inset-0 overflow-hidden">
            {isBlank ? (
              <div className="w-full h-full flex items-center justify-center" style={{ background: idleColor }}>
                <span className="text-xs" style={{ color: '#374151' }}>BLANK</span>
              </div>
            ) : showMedia && liveMediaType === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={liveMediaUrl} alt="" className="w-full h-full object-contain" style={{ background: '#000' }} />
            ) : showMedia && liveMediaType === 'video' ? (
              <OutputVideo url={liveMediaUrl} control={mediaControl} onStatus={onMediaStatus} />
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
                background={bg}
                textStyle={style}
                containerWidth={260}
                animate
                image={liveSlide.image}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: idleColor }}>
                <span className="text-[10px]" style={{ color: '#1f2937' }}>Belum ada output</span>
              </div>
            )}
            {runningText && <RunningTextOverlay runningText={runningText} width={PREVIEW_W} />}
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
