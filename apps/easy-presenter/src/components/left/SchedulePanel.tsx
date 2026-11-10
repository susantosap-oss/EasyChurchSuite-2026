'use client'

import type { ServiceItem } from '../types'

const TYPE_CONFIG = {
  song:         { icon: '♪', color: '#3b82f6', label: 'Lagu' },
  scripture:    { icon: '✝', color: '#22c55e', label: 'Alkitab' },
  announcement: { icon: '📢', color: '#f59e0b', label: 'Pengumuman' },
  media:        { icon: '🖼', color: '#a855f7', label: 'Media' },
}

interface Props {
  service: ServiceItem[]
  activeItemId: string
  liveItemId: string | null
  onSelect: (id: string) => void
}

export function SchedulePanel({ service, activeItemId, liveItemId, onSelect }: Props) {
  return (
    <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
      {service.map((item, idx) => {
        const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.announcement
        const isActive = item.id === activeItemId
        const isLive   = item.id === liveItemId

        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="w-full text-left rounded-lg transition-all group"
            style={{
              background:   isActive ? '#1e2535' : 'transparent',
              border:       `1px solid ${isActive ? '#2a3347' : 'transparent'}`,
              padding:      '7px 10px',
            }}
          >
            <div className="flex items-center gap-2.5">
              {/* Order number */}
              <span
                className="text-[10px] font-mono flex-shrink-0 w-4 text-right"
                style={{ color: '#374151' }}
              >
                {idx + 1}
              </span>

              {/* Type indicator */}
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[11px]"
                style={{ background: `${cfg.color}22`, color: cfg.color }}
              >
                {cfg.icon}
              </div>

              {/* Title + subtitle */}
              <div className="flex-1 min-w-0">
                <div
                  className="text-xs font-medium truncate leading-tight"
                  style={{ color: isActive ? '#f1f5f9' : '#94a3b8' }}
                >
                  {item.title}
                </div>
                {item.subtitle && (
                  <div className="text-[10px] truncate" style={{ color: '#475569' }}>
                    {item.subtitle}
                  </div>
                )}
              </div>

              {/* Live badge */}
              {isLive && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ background: '#dc2626', color: 'white' }}
                >
                  LIVE
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
