'use client'

import React, { useState, useRef, useEffect } from 'react'
import type { ServiceItem, SlideBackground } from '../types'
import { SlideGrid } from './SlideGrid'
import { TapTempoPanel } from './TapTempoPanel'
import { useTapTempo } from '../../hooks/useTapTempo'

interface Props {
  item: ServiceItem
  activeSlideId: string
  liveSlideId: string | null
  isLive: boolean                        // global live state
  onSelectSlide: (id: string) => void   // single click — preview only
  onGoLiveSlide: (id: string) => void   // double click / Ctrl+L — go live
  onClearLive: () => void               // Ctrl+C — clear text, keep background
  isClearLive: boolean                  // current clear-text state
  onEditSlide: (slideId: string) => void
  onUpdateSlide: (slideId: string, updates: Partial<ServiceItem['slides'][0]>) => void
}

function bgToCss(bg: SlideBackground): React.CSSProperties {
  switch (bg.type) {
    case 'solid':    return { background: bg.color ?? '#0a0f1a' }
    case 'gradient': return { background: bg.gradient ?? 'linear-gradient(135deg,#0f172a,#1e1b4b)' }
    default:         return { background: '#0a0f1a' }
  }
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  song:         { label: 'LAGU',       color: '#3b82f6' },
  scripture:    { label: 'ALKITAB',    color: '#22c55e' },
  announcement: { label: 'PENGUMUMAN', color: '#f59e0b' },
  media:        { label: 'MEDIA',      color: '#a855f7' },
}

export function CenterPanel({
  item, activeSlideId, liveSlideId, isLive,
  onSelectSlide, onGoLiveSlide, onClearLive, isClearLive, onEditSlide, onUpdateSlide,
}: Props) {
  const badge        = TYPE_BADGE[item.type] ?? TYPE_BADGE.announcement!
  const hasOverrides = item.slides.some(s => s.backgroundOverride || s.textStyleOverride)
  const isMedia      = item.type === 'media'
  const isSong       = item.type === 'song'
  const videoRef     = useRef<HTMLVideoElement>(null)

  // Whether THIS item is currently on live output
  const isSongLive  = isLive && item.slides.some(s => s.id === liveSlideId)
  const isScripture = item.type === 'scripture'
  const activeSlide = item.slides.find(s => s.id === activeSlideId) ?? item.slides[0] ?? null

  // Scripture monitor: auto-shrink font so text always fits without clipping
  const monitorAreaRef = useRef<HTMLDivElement>(null)
  const textRef        = useRef<HTMLParagraphElement>(null)
  const [autoFontSize, setAutoFontSize] = useState<number | null>(null)

  useEffect(() => {
    if (!isScripture) return
    const id = setTimeout(() => {
      const p    = textRef.current
      const area = monitorAreaRef.current
      if (!p || !area) return

      p.style.fontSize = ''                       // reset to CSS clamp value
      const availH = area.clientHeight - 80       // minus padding (py-6=48) + label (~32)

      if (p.offsetHeight <= availH) { setAutoFontSize(null); return }

      // Binary search: find largest font that fits
      let lo = 12, hi = 64
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1
        p.style.fontSize = `${mid}px`
        if (p.offsetHeight <= availH) lo = mid
        else hi = mid
      }
      p.style.fontSize = ''
      setAutoFontSize(lo)
    }, 40)
    return () => clearTimeout(id)
  }, [activeSlide?.text, isScripture])

  // Tap Tempo — hook always called (Rules of Hooks)
  const tempo = useTapTempo()
  const [beatsPerSlide, setBeatsPerSlide] = useState(4)
  const [numpadDisplay, setNumpadDisplay] = useState('')
  const numpadBufferRef = useRef('')
  const numpadTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset tempo when switching to a non-song item
  useEffect(() => {
    if (!isSong && tempo.isRunning) tempo.reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSong])

  useEffect(() => {
    if (isMedia && item.mediaType === 'video' && videoRef.current) {
      videoRef.current.load()
    }
  }, [isMedia, item.mediaUrl, item.mediaType])

  // Clear numpad buffer when item changes
  useEffect(() => {
    numpadBufferRef.current = ''
    setNumpadDisplay('')
    if (numpadTimerRef.current) clearTimeout(numpadTimerRef.current)
  }, [item.id])

  // Keyboard shortcuts — all non-media items
  useEffect(() => {
    if (isMedia) return
    const slides  = item.slides
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? ''
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

      // Song-only shortcuts
      if (isSong) {
        if (e.ctrlKey && e.key === 'l') { e.preventDefault(); onGoLiveSlide(activeSlideId); return }
        if (e.ctrlKey && e.key === 'c') { e.preventDefault(); onClearLive(); return }
      }

      if (e.ctrlKey || e.altKey || e.metaKey) return

      // ArrowLeft / ArrowRight — prev / next slide
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const curIdx = slides.findIndex(s => s.id === activeSlideId)
        const nextIdx = e.key === 'ArrowLeft' ? curIdx - 1 : curIdx + 1
        if (nextIdx < 0 || nextIdx >= slides.length) return
        const nextId = slides[nextIdx]!.id
        if (isSongLive) onGoLiveSlide(nextId)
        else            onSelectSlide(nextId)
        return
      }

      // Numpad digits — jump to slide N (600ms type-ahead buffer)
      if (e.code.startsWith('Numpad') && /^\d$/.test(e.key)) {
        e.preventDefault()
        numpadBufferRef.current += e.key
        setNumpadDisplay(numpadBufferRef.current)
        if (numpadTimerRef.current) clearTimeout(numpadTimerRef.current)
        numpadTimerRef.current = setTimeout(() => {
          const n = parseInt(numpadBufferRef.current, 10) - 1
          numpadBufferRef.current = ''
          setNumpadDisplay('')
          if (n >= 0 && n < slides.length) {
            const targetId = slides[n]!.id
            if (isSongLive) onGoLiveSlide(targetId)
            else            onSelectSlide(targetId)
          }
        }, 600)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMedia, isSong, activeSlideId, isSongLive, item.slides, onGoLiveSlide, onSelectSlide, onClearLive])

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ background: '#0f1117' }}>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 h-11 flex-shrink-0"
        style={{ background: '#161b27', borderBottom: '1px solid #2a3347' }}>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0"
          style={{ background: `${badge.color}22`, color: badge.color }}>
          {badge.label}
        </span>
        <span className="text-sm font-semibold truncate" style={{ color: '#f1f5f9' }}>{item.title}</span>
        {item.subtitle && (
          <span className="text-xs flex-shrink-0" style={{ color: '#475569' }}>— {item.subtitle}</span>
        )}
        <div className="flex-1" />
        {hasOverrides && (
          <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: '#f59e0b22', color: '#f59e0b' }}>
            ada override
          </span>
        )}
        {numpadDisplay && (
          <span className="text-xs font-mono px-2 py-0.5 rounded flex-shrink-0"
            style={{ background: '#1e3a5f', color: '#60a5fa', border: '1px solid #2563eb' }}>
            → {numpadDisplay}
          </span>
        )}
        {!isMedia && (
          <span className="text-xs flex-shrink-0" style={{ color: '#374151' }}>
            {item.slides.length} slide{item.slides.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Clear Text — only for songs */}
        {isSong && (
          <button
            onClick={onClearLive}
            title="Clear teks output, background tetap (Ctrl+C)"
            className="text-xs px-2.5 py-1 rounded flex-shrink-0 transition-colors"
            style={{
              background: isClearLive ? '#7c2d12' : '#1e1215',
              color:      isClearLive ? '#fed7aa' : '#f87171',
              border:     `1px solid ${isClearLive ? '#c2410c' : '#3b1515'}`,
            }}
          >{isClearLive ? '▣ Cleared' : '▣ Clear'}</button>
        )}

        {/* Go Live shortcut hint + button */}
        {isSong && (
          <button
            onClick={() => onGoLiveSlide(activeSlideId)}
            title="Go Live slide ini (Ctrl+L)"
            className="text-xs px-2.5 py-1 rounded flex-shrink-0 transition-colors"
            style={{
              background: isSongLive ? '#14532d' : '#1e2535',
              color:      isSongLive ? '#86efac' : '#94a3b8',
              border:     `1px solid ${isSongLive ? '#166534' : '#2a3347'}`,
            }}
          >▶ Live  <span style={{ opacity: 0.5, fontSize: 9 }}>Ctrl+L</span></button>
        )}

        {!isMedia && !isSong && !tempo.isRunning && (
          <button
            onClick={() => onEditSlide(activeSlideId)}
            className="text-xs px-2.5 py-1 rounded flex-shrink-0 transition-colors"
            style={{ background: '#1e2535', color: '#3b82f6', border: '1px solid #2a3347' }}
          >Edit</button>
        )}
        {isSong && !tempo.isRunning && (
          <button
            onClick={() => onEditSlide(activeSlideId)}
            className="text-xs px-2.5 py-1 rounded flex-shrink-0 transition-colors"
            style={{ background: '#1e2535', color: '#3b82f6', border: '1px solid #2a3347' }}
          >Edit</button>
        )}
      </div>

      {/* ── SCRIPTURE FULL-PANEL MONITOR VIEW ── */}
      {isScripture ? (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Monitor canvas — fills all available space */}
          <div ref={monitorAreaRef} className="flex-1 relative overflow-hidden m-3 mb-2 rounded-2xl min-h-0"
            style={{
              ...bgToCss(item.background),
              border:    isSongLive ? '2px solid #dc2626' : '2px solid #2a3347',
              boxShadow: isSongLive ? '0 0 28px rgba(220,38,38,0.3)' : 'none',
            }}
          >
            {/* Image background */}
            {item.background.type === 'image' && item.background.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.background.imageUrl} alt=""
                className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }} />
            )}
            {/* Video background */}
            {item.background.type === 'video' && item.background.videoUrl && (
              <video src={item.background.videoUrl} autoPlay loop muted playsInline
                className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }} />
            )}
            {/* Overlay for image/video */}
            {(item.background.type === 'image' || item.background.type === 'video') && (
              <div className="absolute inset-0" style={{
                zIndex: 1,
                background: `rgba(0,0,0,${item.background.imageOverlayOpacity ?? 0.4})`,
              }} />
            )}

            {/* Verse text — centered, auto-fit font */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 py-6"
              style={{ zIndex: 2 }}>
              <p ref={textRef} style={{
                fontFamily:       item.textStyle.fontFamily,
                fontSize:         autoFontSize != null ? `${autoFontSize}px` : 'clamp(22px, 3.8vw, 72px)',
                fontWeight:       item.textStyle.fontWeight,
                textAlign:        item.textStyle.textAlign,
                color:            item.textStyle.color,
                lineHeight:       item.textStyle.lineHeight,
                whiteSpace:       'pre-line',
                textShadow:       item.textStyle.shadow ? '0 2px 12px rgba(0,0,0,0.9), 0 0 32px rgba(0,0,0,0.6)' : 'none',
                WebkitTextStroke: item.textStyle.outline ? `2px ${item.textStyle.outlineColor}` : '0',
                margin:           0,
                maxWidth:         '100%',
              }}>
                {activeSlide?.text ?? ''}
              </p>
              {activeSlide?.label && (
                <p className="mt-4 text-sm font-semibold"
                  style={{ color: item.textStyle.color, opacity: 0.6 }}>
                  {activeSlide.label}
                </p>
              )}
            </div>

            {/* LIVE indicator */}
            {isSongLive && (
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.65)', zIndex: 3 }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold" style={{ color: '#fca5a5' }}>LIVE</span>
              </div>
            )}
          </div>

          {/* Controls strip */}
          <div className="px-3 pb-3 space-y-2 flex-shrink-0">
            {/* Go Live button */}
            <button
              onClick={() => onGoLiveSlide(activeSlideId)}
              className="w-full py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={{
                background: isSongLive ? '#14532d' : '#1d4ed8',
                color:      'white',
                border:     `1px solid ${isSongLive ? '#166534' : '#1e40af'}`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: isSongLive ? '#86efac' : '#93c5fd' }} />
              {isSongLive ? 'Sudah Live — klik ayat lain untuk ganti' : '▶ Go Live — tampilkan ke output'}
            </button>

            {/* Verse selector (multiple slides) */}
            {item.slides.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {item.slides.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { if (isSongLive) onGoLiveSlide(s.id); else onSelectSlide(s.id) }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg cursor-pointer"
                    style={{
                      background: s.id === activeSlideId ? '#1e3a5f' : '#1e2535',
                      border:     `1px solid ${s.id === activeSlideId ? '#2563eb' : '#2a3347'}`,
                    }}
                  >
                    <div className="text-[10px] font-semibold"
                      style={{ color: s.id === activeSlideId ? '#93c5fd' : '#64748b' }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      ) : isMedia ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
          {item.mediaType === 'ppt' && (
            <div className="text-center space-y-3">
              <div className="text-5xl">📊</div>
              <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{item.title}</p>
              <div className="px-4 py-3 rounded-xl text-xs text-left"
                style={{ background: '#1a2235', border: '1px solid #2a3347', color: '#94a3b8', maxWidth: 360 }}>
                <p className="font-semibold mb-1" style={{ color: '#f59e0b' }}>PowerPoint</p>
                <p>File PPT/PPTX perlu dikonversi ke gambar agar dapat ditampilkan langsung.</p>
                <p className="mt-1" style={{ color: '#475569' }}>
                  Gunakan Export → Gambar di PowerPoint, lalu import gambarnya satu per satu.
                </p>
              </div>
              <button
                onClick={() => onGoLiveSlide(item.slides[0]?.id ?? '')}
                className="px-4 py-2 rounded-lg text-xs font-semibold"
                style={{ background: '#a855f7', color: 'white' }}
              >▶ Go Live (slide pertama)</button>
            </div>
          )}

          {item.mediaType === 'image' && item.mediaUrl && (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.mediaUrl} alt={item.title}
                className="max-w-full max-h-full rounded-xl object-contain"
                style={{ maxHeight: 'calc(100% - 48px)' }} />
              <button
                onClick={() => onGoLiveSlide(item.slides[0]?.id ?? '')}
                className="mt-3 px-4 py-2 rounded-lg text-xs font-semibold flex-shrink-0"
                style={{ background: '#a855f7', color: 'white' }}
              >▶ Go Live — ke Output</button>
            </div>
          )}

          {item.mediaType === 'video' && item.mediaUrl && (
            <div className="relative w-full h-full flex flex-col items-center justify-center gap-3">
              <video ref={videoRef} src={item.mediaUrl} controls
                className="max-w-full rounded-xl"
                style={{ maxHeight: 'calc(100% - 56px)' }}
                onPlay={() => onGoLiveSlide(item.slides[0]?.id ?? '')} />
              <button
                onClick={() => onGoLiveSlide(item.slides[0]?.id ?? '')}
                className="px-4 py-2 rounded-lg text-xs font-semibold flex-shrink-0"
                style={{ background: '#a855f7', color: 'white' }}
              >▶ Go Live — ke Output</button>
            </div>
          )}

          {item.mediaType === 'pdf' && item.mediaUrl && (
            <div className="relative w-full h-full flex flex-col gap-2">
              <iframe
                src={item.mediaUrl}
                className="flex-1 w-full rounded-xl"
                style={{ border: 'none', background: '#1a1a1a', minHeight: 0 }}
                title={item.title}
              />
              <button
                onClick={() => onGoLiveSlide(item.slides[0]?.id ?? '')}
                className="px-4 py-2 rounded-lg text-xs font-semibold flex-shrink-0"
                style={{ background: '#a855f7', color: 'white' }}
              >▶ Go Live — ke Output</button>
            </div>
          )}

          {item.mediaType && !item.mediaUrl && (
            <div className="text-center space-y-2">
              <div className="text-4xl">❌</div>
              <p className="text-xs" style={{ color: '#94a3b8' }}>File media tidak tersedia</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ── SLIDE GRID — always visible ── */}
          <div className="flex-1 overflow-hidden min-h-0">
            <SlideGrid
              slides={item.slides}
              activeSlideId={activeSlideId}
              liveSlideId={liveSlideId}
              background={item.background}
              textStyle={item.textStyle}
              onSelect={onSelectSlide}
              onGoLive={onGoLiveSlide}
              onUpdateSlide={onUpdateSlide}
            />
          </div>

          {/* ── TAP TEMPO PANEL — only for songs ── */}
          {isSong && (
            <TapTempoPanel
              slides={item.slides}
              activeSlideId={activeSlideId}
              liveSlideId={liveSlideId}
              background={item.background}
              textStyle={item.textStyle}
              bpm={tempo.bpm}
              setBpm={tempo.setBpm}
              currentBeat={tempo.currentBeat}
              tapCount={tempo.tapCount}
              isRunning={tempo.isRunning}
              tap={tempo.tap}
              stop={tempo.stop}
              reset={tempo.reset}
              beatsPerSlide={beatsPerSlide}
              setBeatsPerSlide={setBeatsPerSlide}
              isSongLive={isSongLive}
              onSelectSlide={onSelectSlide}
              onGoLiveSlide={onGoLiveSlide}
            />
          )}
        </>
      )}
    </div>
  )
}
