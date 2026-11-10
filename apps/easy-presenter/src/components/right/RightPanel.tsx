'use client'

import { useState } from 'react'
import { OutputPanel } from './OutputPanel'
import { StudioPanel } from './StudioPanel'
import { FormatPanel } from './FormatPanel'
import type { Slide, ServiceItem, SlideBackground, TextStyle } from '../types'

type BottomTab = 'format' | 'studio'

interface Props {
  liveSlide: Slide | null
  isBlank: boolean
  isLive: boolean
  onNext: () => void
  onPrev: () => void
  onBlank: () => void
  onGoLive: () => void
  activeItem: ServiceItem
  liveBackground: SlideBackground
  liveTextStyle: TextStyle
  onUpdateBackground: (bg: SlideBackground) => void
  onUpdateTextStyle: (style: Partial<TextStyle>) => void
}

export function RightPanel(props: Props) {
  const [tab, setTab] = useState<BottomTab>('format')
  const { activeItem, liveBackground, liveTextStyle, liveSlide, onUpdateBackground, onUpdateTextStyle, ...panelProps } = props

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{ width: 308, borderLeft: '1px solid #2a3347', background: '#0f1117' }}
    >
      {/* ── OUTPUT — always visible ── */}
      <div
        className="flex-shrink-0"
        style={{ borderBottom: '1px solid #2a3347' }}
      >
        <div
          className="px-3 py-1.5 flex items-center gap-2"
          style={{ background: '#161b27', borderBottom: '1px solid #2a3347' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>Output</span>
          {props.isLive && !props.isBlank && (
            <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: '#dc2626' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              ON AIR
            </span>
          )}
        </div>
        <OutputPanel
          {...panelProps}
          liveSlide={liveSlide}
          background={liveBackground}
          textStyle={liveTextStyle}
        />
      </div>

      {/* ── BOTTOM TABS: Format | Studio ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div
          className="flex items-center px-3 h-8 gap-1 flex-shrink-0"
          style={{ background: '#161b27', borderBottom: '1px solid #2a3347' }}
        >
          {(['format', 'studio'] as BottomTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-0.5 rounded text-xs font-medium transition-colors capitalize"
              style={{
                background:   tab === t ? '#1e2535' : 'transparent',
                color:        tab === t ? '#93c5fd' : '#475569',
                borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
              }}
            >
              {t === 'format' ? 'Format' : 'Studio'}
            </button>
          ))}
          <div className="flex-1" />
          {tab === 'format' && (
            <span className="text-[9px]" style={{ color: '#374151' }}>
              {activeItem.title.substring(0, 18)}{activeItem.title.length > 18 ? '…' : ''}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {tab === 'format' && (
            <FormatPanel
              background={activeItem.background}
              textStyle={activeItem.textStyle}
              onUpdateBackground={onUpdateBackground}
              onUpdateTextStyle={onUpdateTextStyle}
            />
          )}
          {tab === 'studio' && (
            <StudioPanel liveSlide={liveSlide} />
          )}
        </div>
      </div>
    </div>
  )
}
