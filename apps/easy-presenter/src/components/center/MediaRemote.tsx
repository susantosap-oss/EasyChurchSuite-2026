'use client'

import { useEffect, useRef } from 'react'
import type { MediaControl, MediaStatus } from '../types'
import { useLowSpec } from '@/lib/perfMode'

interface Props {
  url: string
  isLive: boolean                  // this video is on output
  control: MediaControl
  status: MediaStatus
  onControl: (patch: Partial<MediaControl>) => void
  /** Go live starting at `time` seconds */
  onGoLive: (time: number) => void
}

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) t = 0
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const DRIFT_TOLERANCE = 0.35  // seconds before the preview re-syncs to output

/**
 * Center-panel video player.
 * - Not live: normal local preview (own controls); pressing play sends it live.
 * - Live: muted preview that follows the output player; the control bar drives output.
 */
export function MediaRemote({ url, isLive, control, status, onControl, onGoLive }: Props) {
  const previewRef = useRef<HTMLVideoElement>(null)
  // Low-spec PCs: no second decoder for the live preview — output keeps playing, controls still work
  const lowSpec    = useLowSpec()
  const liveStatus = status.url === url ? status : null
  const duration   = liveStatus?.duration || previewRef.current?.duration || 0
  const current    = liveStatus?.currentTime ?? 0

  // Live: keep the muted preview in step with output
  useEffect(() => {
    const v = previewRef.current
    if (!v || !isLive || !liveStatus) return
    if (Math.abs(v.currentTime - liveStatus.currentTime) > DRIFT_TOLERANCE) v.currentTime = liveStatus.currentTime
  }, [isLive, liveStatus])

  useEffect(() => {
    const v = previewRef.current
    if (!v || !isLive) return
    if (control.playing && !liveStatus?.ended) v.play().catch(() => {})
    else v.pause()
  }, [isLive, control.playing, liveStatus?.ended])

  const seek = (time: number) => onControl({ seek: { url, time, nonce: Date.now() } })
  const isPlaying = control.playing && !liveStatus?.ended

  // Space = play / pause output while live
  useEffect(() => {
    if (!isLive) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? ''
      if (e.code !== 'Space' || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return
      e.preventDefault()
      onControl({ playing: !isPlaying })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isLive, isPlaying, onControl])

  if (!isLive) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center gap-3">
        <video
          ref={previewRef}
          src={url}
          controls
          className="max-w-full rounded-xl"
          style={{ maxHeight: 'calc(100% - 56px)' }}
          onPlay={e => {
            // Playing the preview sends the video live from this position; output takes over audio
            const v = e.currentTarget
            v.pause()
            onGoLive(v.currentTime)
          }}
        />
        <button
          onClick={() => onGoLive(previewRef.current?.currentTime ?? 0)}
          className="px-4 py-2 rounded-lg text-xs font-semibold flex-shrink-0"
          style={{ background: '#a855f7', color: 'white' }}
        >▶ Go Live — ke Output</button>
      </div>
    )
  }

  const btn = (active = false): React.CSSProperties => ({
    background: active ? '#1d4ed8' : '#1e2535',
    color: '#ffffff',
    border: `1px solid ${active ? '#2563eb' : '#2a3347'}`,
  })

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-2">
      <div className="relative min-h-0 flex-1 flex items-center justify-center w-full">
        {lowSpec ? (
          <div className="w-full h-full max-h-full rounded-xl flex flex-col items-center justify-center gap-1"
            style={{ border: '2px solid #dc2626', background: '#0a0f1a', aspectRatio: '16 / 9' }}>
            <span className="text-4xl">🎬</span>
            <span className="text-[11px]" style={{ color: '#94a3b8' }}>Preview dimatikan (Mode Spek Rendah)</span>
          </div>
        ) : (
          <video
            ref={previewRef}
            src={url}
            muted
            playsInline
            className="max-w-full max-h-full rounded-xl"
            style={{ border: '2px solid #dc2626' }}
          />
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.65)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold" style={{ color: '#fca5a5' }}>LIVE — kontrol output</span>
        </div>
      </div>

      {/* Remote control bar — drives the output player */}
      <div className="w-full flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0"
        style={{ background: '#161b27', border: '1px solid #2a3347' }}>
        <button onClick={() => onControl({ playing: !isPlaying })}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          className="w-9 h-8 rounded-lg text-sm font-bold flex-shrink-0" style={btn(isPlaying)}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={() => onControl({ playing: false, seek: { url, time: 0, nonce: Date.now() } })}
          title="Stop — kembali ke awal"
          className="w-9 h-8 rounded-lg text-sm flex-shrink-0" style={btn()}>⏹</button>

        <span className="text-[11px] font-mono flex-shrink-0" style={{ color: '#e2e8f0' }}>{fmt(current)}</span>
        <input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(current, duration || 0)}
          onChange={e => seek(Number(e.target.value))}
          className="flex-1 min-w-0" />
        <span className="text-[11px] font-mono flex-shrink-0" style={{ color: '#94a3b8' }}>{fmt(duration)}</span>

        <button onClick={() => onControl({ muted: !control.muted })}
          title={control.muted ? 'Unmute output' : 'Mute output'}
          className="w-9 h-8 rounded-lg text-sm flex-shrink-0"
          style={{ ...btn(), background: control.muted ? '#7f1d1d' : '#1e2535' }}>
          {control.muted ? '🔇' : '🔊'}
        </button>
        <input type="range" min={0} max={1} step={0.05} value={control.muted ? 0 : control.volume}
          onChange={e => {
            const v = Number(e.target.value)
            onControl({ volume: v, muted: v === 0 })
          }}
          title="Volume output"
          style={{ width: 80 }} className="flex-shrink-0" />
        <button onClick={() => onControl({ loop: !control.loop })}
          title="Loop"
          className="w-9 h-8 rounded-lg text-sm flex-shrink-0" style={btn(control.loop)}>🔁</button>
      </div>
    </div>
  )
}
