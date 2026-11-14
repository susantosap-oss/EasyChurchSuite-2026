// Phone remote (Operator / Speaker): what the operator window sends to phones and what the
// Operator phone can ask for. The Electron main process relays both (electron/remote.ts).
import type { ItemType } from '@/components/types'

export interface RemoteSlide { id: string; label: string; text: string }

export interface RemoteSnapshot {
  isLive: boolean
  isBlank: boolean
  isClear: boolean
  /** What is on air (text includes the verse reference); null when nothing is live */
  live: { title: string; label: string; text: string } | null
  /** What comes after the live slide (or the selected slide while not live) */
  next: { label: string; text: string } | null
  items: { id: string; title: string; subtitle: string; kind: string }[]
  activeItemId: string
  activeTitle: string
  liveItemId: string | null
  slides: RemoteSlide[]
  activeSlideId: string
  liveSlideId: string | null
  runningText: string | null
}

export type RemoteCommand =
  | { type: 'prev' | 'next' | 'live' | 'blank' | 'clear' }
  | { type: 'selectItem'; id: string }
  | { type: 'liveSlide'; itemId: string; slideId: string }
  /** Operator Bible search → put this verse on air (same as the search box in the app) */
  | { type: 'quick'; text: string; label: string; version?: string }

export const ITEM_KIND: Record<ItemType, string> = {
  song: 'Lagu', scripture: 'Alkitab', announcement: 'Pengumuman', media: 'Media',
}
