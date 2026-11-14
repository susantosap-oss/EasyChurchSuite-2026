// Live output state broadcast from the operator window to output windows (/output?display=N).
// BroadcastChannel works between same-origin windows — browser tabs and Electron windows alike.
import type { ItemType, SlideBackground, TextStyle } from '@/components/types'
import type { AppSettings, ChromaTarget } from '@/components/settings/appSettings'

export const OUTPUT_CHANNEL = 'easychurch-output'

/** Studio → Running Text: ticker strip shown over whatever is live */
export interface RunningText {
  text: string
  direction: 'ltr' | 'rtl'
  /** Frame widths per second */
  speed: number
}

export interface OutputState {
  blank: boolean
  /** Live text slide (null = nothing on screen) */
  slide: { text: string; image?: string } | null
  itemType: ItemType | null
  background: SlideBackground
  textStyle: TextStyle
  /** Live media (image / video / pdf) instead of a slide */
  media: { url: string; type: 'image' | 'video' | 'pdf' } | null
  /** Video sync: output windows follow the operator's master player (muted) */
  video: { playing: boolean; currentTime: number; loop: boolean } | null
  runningText: RunningText | null
  /** Per output chroma key: colour (null = off), which item types it keys, and whether keyed text goes to the bottom */
  key: {
    display1: ChromaKeyState
    display2: ChromaKeyState
  }
  display2: AppSettings['display2']
  display2Mode: AppSettings['output']['display2']['mode']
  lowSpec: boolean
}

export interface ChromaKeyState { color: string | null; for: ChromaTarget; subtitle: boolean; subtitleSize: number }

export type OutputMessage =
  | { type: 'state'; state: OutputState }
  | { type: 'request-state' }       // a newly opened output window asks for the current state

export function openOutputChannel(): BroadcastChannel | null {
  return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(OUTPUT_CHANNEL)
}
