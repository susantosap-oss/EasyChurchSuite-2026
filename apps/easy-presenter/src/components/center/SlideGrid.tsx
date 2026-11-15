'use client'

import { useRef, useState } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth'
import { SlideCanvas } from '../shared/SlideCanvas'
import type { Slide, SlideBackground, TextStyle, TextAnimation } from '../types'
import { animGroupKey } from '../types'
import { groupColor } from '../left/AddSongModal'
import { ContextMenu, menuPosFrom, type MenuPos, type MenuItem } from '../shared/ContextMenu'

// Pause length in bars (1 bar = the beat/slide setting); half bars for songs that breathe between lines
const JEDA_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5]
/** Smallest card width — readable text on low-res screens; wider screens get more / bigger cards */
const MIN_CARD_W = 140
const GAP = 8   // matches gap-2

interface Props {
  slides: Slide[]
  activeSlideId: string
  liveSlideId: string | null
  background: SlideBackground
  textStyle: TextStyle
  onSelect: (id: string) => void
  onGoLive: (id: string) => void
  onUpdateSlide?: (id: string, updates: Partial<Slide>) => void
  isItemLive?: boolean   // this item is on output → single click sends slide live
  groupAnimations?: Record<string, TextAnimation>
  /** Right-click menu: edit this slide (same as the Edit button) / the whole song's text */
  onEditSlide?: (id: string) => void
  onEditAll?: () => void
}

export function SlideGrid({
  slides, activeSlideId, liveSlideId, background, textStyle,
  onSelect, onGoLive, onUpdateSlide, isItemLive = false, groupAnimations, onEditSlide, onEditAll,
}: Props) {
  const [jedaEditId, setJedaEditId] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ slide: Slide; pos: MenuPos } | null>(null)
  const menuItems: MenuItem[] = menu ? [
    ...(onEditAll   ? [{ label: '📝  Edit Semua Slide', onSelect: onEditAll }] : []),
    ...(onEditSlide ? [{ label: '✎  Edit Slide Ini', onSelect: () => onEditSlide(menu.slide.id) }] : []),
  ] : []
  // Real card width, so thumbnail text scales with the card instead of a fixed 110px guess
  const gridRef = useRef<HTMLDivElement>(null)
  const gridW   = useElementWidth(gridRef)
  const cols    = Math.max(1, Math.floor((gridW + GAP) / (MIN_CARD_W + GAP)))
  const cardW   = gridW ? (gridW - GAP * (cols - 1)) / cols : MIN_CARD_W

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center gap-1.5 mb-2 px-0.5">
        {isItemLive ? (
          <span className="text-[9px] font-semibold" style={{ color: '#f87171' }}>● LIVE — Klik = tampilkan slide ke output</span>
        ) : (
          <>
            <span className="text-[9px]" style={{ color: '#94a3b8' }}>Klik = pilih</span>
            <span className="text-[9px]" style={{ color: '#475569' }}>·</span>
            <span className="text-[9px] font-semibold" style={{ color: '#f87171' }}>2× = Go Live</span>
          </>
        )}
      </div>
      <div ref={gridRef} className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${MIN_CARD_W}px, 1fr))` }}>
        {slides.map((slide, idx) => {
          const isActive = slide.id === activeSlideId
          const isLive   = slide.id === liveSlideId
          const isLast   = idx === slides.length - 1

          const bg = slide.backgroundOverride ?? background
          const ts: TextStyle = slide.textStyleOverride
            ? { ...textStyle, ...slide.textStyleOverride }
            : textStyle

          // Jeda (tap-tempo pause) is only editable when onUpdateSlide is provided
          const hasJeda     = !!onUpdateSlide && !!slide.jedaBars && slide.jedaBars > 0
          const isEditingJeda = jedaEditId === slide.id

          return (
            <div key={slide.id} className="flex flex-col">
              {/* Slide card */}
              <button
                onClick={() => (isItemLive ? onGoLive(slide.id) : onSelect(slide.id))}
                onDoubleClick={() => onGoLive(slide.id)}
                onContextMenu={e => {
                  if (!onEditAll && !onEditSlide) return
                  setMenu({ slide, pos: menuPosFrom(e) })
                }}
                className="text-left rounded-xl overflow-hidden transition-all"
                style={{
                  borderRadius: (hasJeda || isEditingJeda) ? '12px 12px 0 0' : '12px',
                  border:     isActive ? '2px solid #3b82f6' : isLive ? '2px solid #dc2626' : '2px solid #2a3347',
                  borderBottom: (hasJeda || isEditingJeda) ? 'none' : undefined,
                  background: '#161b27',
                  boxShadow:  isActive ? '0 0 0 3px rgba(59,130,246,0.15)' : isLive ? '0 0 0 3px rgba(220,38,38,0.15)' : 'none',
                  transform:  isActive ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* 16:9 preview */}
                <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                  <div className="absolute inset-0">
                    <SlideCanvas text={slide.text} background={bg} textStyle={ts} containerWidth={cardW} image={slide.image} thumbnail />
                  </div>

                  {(slide.backgroundOverride || slide.textStyleOverride) && (
                    <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full"
                      style={{ background: '#f59e0b', zIndex: 10 }} title="Override aktif" />
                  )}

                  {isLive && (
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{ background: '#dc2626', color: 'white', zIndex: 10 }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </div>
                  )}

                  <div className="absolute bottom-1.5 left-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(0,0,0,0.6)', color: '#64748b', zIndex: 10 }}>
                    {idx + 1}
                  </div>
                </div>

                {/* Label row */}
                <div className="px-2.5 py-1.5 flex items-center gap-2" style={{ borderTop: '1px solid #2a3347' }}>
                  <span className="text-[10px] font-medium truncate flex-1"
                    style={{ color: isActive ? '#93c5fd' : '#64748b' }}>
                    {slide.label}
                  </span>
                  {groupAnimations?.[animGroupKey(slide.label)] && (
                    <span className="text-[9px] flex-shrink-0" title={`Animasi grup ${animGroupKey(slide.label)}`}
                      style={{ color: groupColor(slide.label) }}>✨</span>
                  )}
                  {isActive && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#3b82f6' }} />}
                </div>
              </button>

              {/* Jeda row — only when jeda editing is enabled */}
              {onUpdateSlide && (
                <div
                  className="flex items-center justify-center"
                  style={{
                    background:   '#0d1118',
                    border:       isActive ? '2px solid #3b82f6' : isLive ? '2px solid #dc2626' : '2px solid #2a3347',
                    borderTop:    'none',
                    borderRadius: '0 0 8px 8px',
                    minHeight:    22,
                    padding:      '2px 6px',
                  }}
                >
                  {hasJeda && !isEditingJeda ? (
                    // Show existing jeda
                    <div className="flex items-center gap-1 w-full justify-between">
                      <span className="text-[9px] font-semibold" style={{ color: '#fb923c' }}>
                        ⏸ {slide.jedaBars} bar
                      </span>
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => setJedaEditId(slide.id)}
                          className="text-[8px] px-1 rounded"
                          style={{ background: '#2a1800', color: '#fb923c' }}
                        >edit</button>
                        <button
                          onClick={() => onUpdateSlide?.(slide.id, { jedaBars: undefined })}
                          className="text-[8px] px-1 rounded"
                          style={{ background: '#1e2535', color: '#475569' }}
                        >×</button>
                      </div>
                    </div>
                  ) : isEditingJeda ? (
                    // Inline bar picker
                    <div className="flex items-center gap-0.5 w-full justify-center flex-wrap py-0.5">
                      <span className="text-[8px] mr-0.5" style={{ color: '#475569' }}>bar:</span>
                      {JEDA_OPTIONS.map(n => (
                        <button
                          key={n}
                          onClick={() => { onUpdateSlide?.(slide.id, { jedaBars: n }); setJedaEditId(null) }}
                          className="text-[8px] rounded px-1 py-0.5 font-mono"
                          style={{
                            background: slide.jedaBars === n ? '#7c2d12' : '#1e2535',
                            color:      slide.jedaBars === n ? '#fed7aa' : '#94a3b8',
                            border:     `1px solid ${slide.jedaBars === n ? '#c2410c' : '#2a3347'}`,
                          }}
                        >{n}</button>
                      ))}
                      <button
                        onClick={() => setJedaEditId(null)}
                        className="text-[8px] ml-0.5 px-1 rounded"
                        style={{ color: '#475569' }}
                      >✕</button>
                    </div>
                  ) : (
                    // No jeda — show subtle + button
                    <button
                      onClick={() => setJedaEditId(slide.id)}
                      className="text-[8px] w-full text-center transition-colors"
                      style={{ color: '#2d3748' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#f97316' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#2d3748' }}
                    >+ jeda</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {menu && menuItems.length > 0 && (
        <ContextMenu pos={menu.pos} title={menu.slide.label} items={menuItems} onClose={() => setMenu(null)} />
      )}
    </div>
  )
}
