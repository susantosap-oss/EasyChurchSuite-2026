'use client'

import type { ServiceItem } from '../types'
import { SlideGrid } from './SlideGrid'

interface Props {
  item: ServiceItem
  activeSlideId: string
  liveSlideId: string | null
  onSelectSlide: (id: string) => void
  onEditSlide: (slideId: string) => void
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  song:         { label: 'LAGU',       color: '#3b82f6' },
  scripture:    { label: 'ALKITAB',    color: '#22c55e' },
  announcement: { label: 'PENGUMUMAN', color: '#f59e0b' },
  media:        { label: 'MEDIA',      color: '#a855f7' },
}

export function CenterPanel({ item, activeSlideId, liveSlideId, onSelectSlide, onEditSlide }: Props) {
  const badge = TYPE_BADGE[item.type] ?? TYPE_BADGE.announcement!
  const hasOverrides = item.slides.some(s => s.backgroundOverride || s.textStyleOverride)

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ background: '#0f1117' }}>
      {/* Item toolbar */}
      <div className="flex items-center gap-3 px-4 h-11 flex-shrink-0"
        style={{ background: '#161b27', borderBottom: '1px solid #2a3347' }}>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded"
          style={{ background: `${badge.color}22`, color: badge.color }}>
          {badge.label}
        </span>
        <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{item.title}</span>
        {item.subtitle && (
          <span className="text-xs" style={{ color: '#475569' }}>— {item.subtitle}</span>
        )}
        <div className="flex-1" />
        {hasOverrides && (
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
            ada override
          </span>
        )}
        <span className="text-xs" style={{ color: '#374151' }}>
          {item.slides.length} slide{item.slides.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => onEditSlide(activeSlideId)}
          className="text-xs px-2.5 py-1 rounded transition-colors"
          style={{ background: '#1e2535', color: '#3b82f6', border: '1px solid #2a3347' }}
        >
          Edit
        </button>
      </div>

      <SlideGrid
        slides={item.slides}
        activeSlideId={activeSlideId}
        liveSlideId={liveSlideId}
        background={item.background}
        textStyle={item.textStyle}
        onSelect={onSelectSlide}
      />
    </div>
  )
}
