'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { MediaControl, MediaStatus } from '../types'

interface Props {
  url: string
  control: MediaControl
  onStatus: (status: MediaStatus) => void
}

/**
 * Live output video — the single master player (picture + audio).
 * Play/pause, mute, volume, loop and seek all come from `control`
 * (driven by the Center panel remote); position is reported via onStatus.
 */
export function OutputVideo({ url, control, onStatus }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const appliedSeek = useRef<number | null>(null)

  const report = useCallback(() => {
    const v = ref.current
    if (!v) return
    onStatus({
      url,
      currentTime: v.currentTime,
      duration: Number.isFinite(v.duration) ? v.duration : 0,
      ended: v.ended,
    })
  }, [url, onStatus])

  const applySeek = useCallback(() => {
    const v = ref.current
    const s = control.seek
    if (!v || !s || s.url !== url || s.nonce === appliedSeek.current || v.readyState < 1) return
    v.currentTime = Math.min(s.time, Number.isFinite(v.duration) ? v.duration : s.time)
    appliedSeek.current = s.nonce
    report()
  }, [control.seek, url, report])

  // Audio settings
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted  = control.muted
    v.volume = control.volume
    v.loop   = control.loop
  }, [control.muted, control.volume, control.loop])

  // Play / pause
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (control.playing) {
      if (v.ended) v.currentTime = 0
      v.play().catch(() => { /* autoplay blocked — operator can press play again */ })
    } else {
      v.pause()
    }
  }, [control.playing, url])

  useEffect(applySeek, [applySeek])

  return (
    <video
      ref={ref}
      src={url}
      className="w-full h-full object-contain"
      style={{ background: '#000' }}
      playsInline
      onLoadedMetadata={() => { applySeek(); report() }}
      onTimeUpdate={report}
      onSeeked={report}
      onEnded={report}
    />
  )
}
