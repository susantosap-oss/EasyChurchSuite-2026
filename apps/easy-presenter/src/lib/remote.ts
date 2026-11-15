// Phone remote (Operator / Speaker): what the operator window sends to phones and what the
// Operator phone can ask for. The Electron main process relays both (electron/remote.ts).
import type { ItemType, BgEntry } from '@/components/types'

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
  /**
   * Operator: Animasi Teks presets for the selected item (null when it has no text, e.g. a video);
   * current = preset in use, 'none' = off, null = hand-tuned in the app
   */
  textAnim: { presets: string[]; current: string | null } | null
  /** Operator: the selected item's Background Playlist (null for media items) */
  bgPlaylist: { entries: RemoteBg[]; activeId: string | null } | null
}

/**
 * A playlist entry as the phone draws it: an image goes through the /img proxy; everything else
 * is a CSS swatch (videos are never sent to the phone — too heavy for the church Wi-Fi)
 */
export interface RemoteBg { id: string; name: string; kind: 'solid' | 'gradient' | 'image' | 'video' | 'animated'; swatch: string; image?: string }

// Colours that stand for the built-in animated backgrounds
const ANIMATED_SWATCH: Record<string, string> = {
  'gradient-pulse': 'linear-gradient(135deg,#1e3a8a,#312e81)',
  aurora:           'linear-gradient(135deg,#0f766e,#4c1d95)',
  worship:          'linear-gradient(135deg,#78350f,#451a03)',
  fire:             'linear-gradient(135deg,#b91c1c,#f97316)',
}

export function remoteBg(e: BgEntry): RemoteBg {
  const bg = e.background
  const base = { id: e.id, name: e.name }
  switch (bg.type) {
    case 'solid':    return { ...base, kind: 'solid', swatch: bg.color ?? '#000' }
    case 'gradient': return { ...base, kind: 'gradient', swatch: bg.gradient ?? '#000' }
    case 'image':    return { ...base, kind: 'image', swatch: '#111827', image: bg.imageUrl?.startsWith('/api/') ? bg.imageUrl : undefined }
    case 'video':    return { ...base, kind: 'video', swatch: 'linear-gradient(135deg,#1e293b,#0f172a)' }
    default:         return { ...base, kind: 'animated', swatch: ANIMATED_SWATCH[bg.animated ?? ''] ?? 'linear-gradient(135deg,#334155,#1e1b4b)' }
  }
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
  /** Operator: Animasi Teks preset (by name, 'none' = off) for the selected item, all its slides */
  | { type: 'textAnim'; preset: string }
  /** Operator: pick a Background Playlist entry of the selected item (null = back to its default) */
  | { type: 'bg'; id: string | null }

export const ITEM_KIND: Record<ItemType, string> = {
  song: 'Lagu', scripture: 'Alkitab', announcement: 'Pengumuman', media: 'Media',
}
