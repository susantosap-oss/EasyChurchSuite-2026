'use client'

import { useEffect, useState } from 'react'
import type { ServiceItem, Slide } from './types'

interface Props {
  item: ServiceItem
  slide: Slide
  liveSlideId: string | null
  isLive: boolean
}

export function StatusBar({ item, slide, liveSlideId, isLive }: Props) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  const slideIndex = item.slides.findIndex(s => s.id === slide.id) + 1

  return (
    <div
      className="flex items-center gap-6 px-4 h-7 flex-shrink-0 text-xs"
      style={{ background: '#0a0d14', borderTop: '1px solid #2a3347', color: '#475569' }}
    >
      <span className="font-medium" style={{ color: '#94a3b8' }}>
        {item.title}
      </span>
      <span>·</span>
      <span>{slide.label}</span>
      <span>·</span>
      <span>Slide {slideIndex} / {item.slides.length}</span>
      <div className="flex-1" />
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
        <span>Sync: 0 remotes</span>
      </div>
      <span>·</span>
      {isLive ? (
        <span className="flex items-center gap-1 font-semibold" style={{ color: '#dc2626' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </span>
      ) : (
        <span>Standby</span>
      )}
      <span>·</span>
      <span className="font-mono" style={{ color: '#64748b' }}>{time}</span>
    </div>
  )
}
