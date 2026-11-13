'use client'

import { useEffect, useRef, useState } from 'react'
import { SlideCanvas } from '@/components/shared/SlideCanvas'
import { textSettingsToStyle } from '@/components/settings/appSettings'
import { openOutputChannel, type OutputMessage, type OutputState } from '@/lib/outputBus'
import { setLowSpec } from '@/lib/perfMode'
import type { SlideBackground, TextStyle } from '@/components/types'

interface LowerThird { name: string; title: string }

const VIDEO_DRIFT = 0.5  // seconds before re-syncing to the operator's master player

/** Muted video that follows the operator window's master player */
function SyncedVideo({ url, video }: { url: string; video: NonNullable<OutputState['video']> }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.loop = video.loop
    if (Math.abs(v.currentTime - video.currentTime) > VIDEO_DRIFT) v.currentTime = video.currentTime
    if (video.playing && v.paused) v.play().catch(() => {})
    if (!video.playing && !v.paused) v.pause()
  }, [video])
  return <video ref={ref} src={url} muted playsInline className="w-full h-full object-contain" />
}

/**
 * Projector / stream output — /output?display=1 (main) or /output?display=2 (second layer).
 * Receives the live state from the operator window over BroadcastChannel.
 */
export default function OutputPage() {
  const [display, setDisplay] = useState<1 | 2>(1)
  const [state, setState]     = useState<OutputState | null>(null)
  const [lowerThird, setLowerThird] = useState<LowerThird | null>(null)
  const [size, setSize] = useState({ w: 1920, h: 1080 })

  useEffect(() => {
    setDisplay(new URLSearchParams(window.location.search).get('display') === '2' ? 2 : 1)

    const ch = openOutputChannel()
    if (ch) {
      ch.onmessage = (e: MessageEvent<OutputMessage>) => {
        if (e.data.type === 'state') {
          setState(e.data.state)
          setLowSpec(e.data.state.lowSpec)
        }
      }
      ch.postMessage({ type: 'request-state' } satisfies OutputMessage)
    }

    // Lower thirds from the Studio panel (Electron IPC)
    const cleanup = window.electronAPI?.onSlideCommand(data => {
      const cmd = data as { type: string; name?: string; title?: string }
      if (cmd.type === 'lower-third') setLowerThird({ name: cmd.name ?? '', title: cmd.title ?? '' })
      else if (cmd.type === 'clear') setLowerThird(null)
    })

    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    onResize()
    window.addEventListener('resize', onResize)
    return () => { ch?.close(); cleanup?.(); window.removeEventListener('resize', onResize) }
  }, [])

  // Fit a 16:9 frame inside the window
  const boxW = Math.min(size.w, (size.h * 16) / 9)
  const boxH = (boxW * 9) / 16

  // Display 2 "custom": own font / position / per-type backgrounds, no text animation
  let background: SlideBackground | null = state?.background ?? null
  let textStyle: TextStyle | null = state?.textStyle ?? null
  if (state && display === 2 && state.display2Mode === 'custom') {
    textStyle = { ...state.textStyle, ...textSettingsToStyle(state.display2.text), animation: undefined }
    if (state.itemType === 'song') background = state.display2.songBackground
    else if (state.itemType === 'scripture') background = state.display2.scriptureBackground
  }

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden" style={{ cursor: 'none' }}>
      <div className="relative overflow-hidden" style={{ width: boxW, height: boxH, background: '#000' }}>
        {state && !state.blank && (
          state.media ? (
            state.media.type === 'video' && state.video ? (
              <SyncedVideo url={state.media.url} video={state.video} />
            ) : state.media.type === 'pdf' ? (
              <iframe src={state.media.url} className="w-full h-full" style={{ border: 'none' }} title="PDF" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.media.url} alt="" className="w-full h-full object-contain" />
            )
          ) : state.slide && background && textStyle ? (
            <SlideCanvas
              text={state.slide.text}
              image={state.slide.image}
              background={background}
              textStyle={textStyle}
              containerWidth={boxW}
              scaled
              animate
            />
          ) : null
        )}

        {lowerThird && (
          <div className="absolute left-[5%] bottom-[8%] px-[2%] py-[1%] rounded"
            style={{ background: 'rgba(15,23,42,0.85)', borderLeft: `${boxW * 0.004}px solid #3b82f6`, zIndex: 20 }}>
            <div style={{ color: '#fff', fontSize: boxW * 0.022, fontWeight: 700 }}>{lowerThird.name}</div>
            {lowerThird.title && <div style={{ color: '#cbd5e1', fontSize: boxW * 0.014 }}>{lowerThird.title}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
