// Phone remote (Operator / Speaker): what the operator window sends to phones and what the
// Operator phone can ask for. The Electron main process relays both (electron/remote.ts).
import type { ItemType } from '@/components/types'

/** image: presentation page picture (shown as a thumbnail on the Operator phone) */
export interface RemoteSlide { id: string; label: string; text: string; image?: string }

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
  /** Files the operator marked [v] for the Speaker (PDF: page image URLs; image / video: the file) */
  decks: { id: string; name: string; kind: 'pdf' | 'image' | 'video'; pages: string[] }[]
  /** A Speaker deck is on air: which one and which page (0-based) */
  liveDeck: { id: string; page: number } | null
  /** Picture on air (presentation page / image), for the Speaker live view */
  liveImage: string | null
}

export type RemoteCommand =
  | { type: 'prev' | 'next' | 'live' | 'blank' | 'clear' }
  | { type: 'selectItem'; id: string }
  | { type: 'liveSlide'; itemId: string; slideId: string }
  /** Operator Bible search → put this verse on air (same as the search box in the app) */
  | { type: 'quick'; text: string; label: string; version?: string }
  /** Speaker: put page N of a marked file on air / step the presentation that is on air */
  | { type: 'deck'; id: string; page: number }
  | { type: 'deckStep'; delta: 1 | -1 }
  /** Operator: open a Media library file as a service item (selected, not yet live) */
  | { type: 'media'; file: string }

export const ITEM_KIND: Record<ItemType, string> = {
  song: 'Lagu', scripture: 'Alkitab', announcement: 'Pengumuman', media: 'Media',
}
