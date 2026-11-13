export type ItemType = 'song' | 'scripture' | 'announcement' | 'media'
// 'slides' = presentation converted to one image per slide (e.g. PDF pages)
export type MediaType = 'image' | 'video' | 'ppt' | 'pdf' | 'slides'
export type AnimatedBgType = 'gradient-pulse' | 'aurora' | 'worship' | 'fire' | 'custom'
export type VerticalPosition = 'top' | 'upper' | 'center' | 'lower' | 'bottom'
export type TextAlignMode = 'left' | 'center' | 'right'

export interface SlideBackground {
  type: 'solid' | 'gradient' | 'image' | 'video' | 'animated'
  color?: string
  gradient?: string
  imageUrl?: string
  videoUrl?: string
  imageOverlayOpacity?: number  // 0–1 dark overlay for image/video/custom-animated
  animated?: AnimatedBgType
  animatedCustomUrl?: string   // blob URL for custom video/GIF animated background
  animatedCustomType?: 'video' | 'gif'
}

export interface TextStyle {
  fontFamily: string
  fontSize: number          // px @ 1920-wide design
  fontWeight: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  textAlign: TextAlignMode
  verticalPosition: VerticalPosition
  positionOffset: number    // extra px from edge (top→top offset, bottom→bottom offset)
  color: string
  shadow: boolean
  outline: boolean
  outlineColor: string
  lineHeight: number        // 1.0–3.0
  animation?: TextAnimation // optional — older scenes have none
}

export type TextEnterEffect =
  | 'none' | 'fade' | 'zoom-in' | 'zoom-out' | 'slide-up' | 'slide-down'
  | 'blur' | 'bounce' | 'pop' | 'flip' | 'type'
export type TextLoopEffect = 'none' | 'pulse' | 'glow' | 'neon' | 'float' | 'bounce' | 'breathe'
export type TextAnimUnit = 'slide' | 'line' | 'word' | 'char'

export interface TextAnimation {
  enter: TextEnterEffect    // plays each time the slide changes
  loop: TextLoopEffect      // runs continuously after the entrance
  unit: TextAnimUnit        // animate the whole slide, or per line / word / character
  duration: number          // ms — entrance duration per unit
  stagger: number           // ms — delay between consecutive units
  loopSpeed: number         // s  — one loop cycle
  glowColor: string         // glow / neon color
}

export const DEFAULT_TEXT_ANIMATION: TextAnimation = {
  enter: 'none',
  loop: 'none',
  unit: 'slide',
  duration: 600,
  stagger: 60,
  loopSpeed: 2,
  glowColor: '#60a5fa',
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 72,
  fontWeight: 'normal',
  textAlign: 'center',
  verticalPosition: 'center',
  positionOffset: 0,
  color: '#ffffff',
  shadow: true,
  outline: false,
  outlineColor: '#000000',
  lineHeight: 1.4,
}

export const DEFAULT_SONG_BG: SlideBackground = {
  type: 'animated',
  animated: 'gradient-pulse',
}

export const DEFAULT_SCRIPTURE_BG: SlideBackground = {
  type: 'solid',
  color: '#0a0f1a',
}

export interface Slide {
  id: string
  label: string
  text: string
  note?: string
  backgroundOverride?: SlideBackground
  textStyleOverride?: Partial<TextStyle>
  jedaBars?: number  // pause N bars before auto-advancing to next slide
  image?: string     // full-slide picture shown letterboxed above the background (presentation pages)
}

export interface ServiceItem {
  id: string
  type: ItemType
  title: string
  subtitle: string
  slides: Slide[]
  background: SlideBackground
  textStyle: TextStyle
  mediaUrl?: string
  mediaType?: MediaType
  groupAnimations?: Record<string, TextAnimation>  // per group ("Verse", "Chorus", …) — overrides textStyle.animation
  songId?: number          // songs.id in the database (songs only)
  bgPlaylist?: BgEntry[]   // operator's background playlist for this item
  activeBgId?: string      // bgPlaylist entry currently used on output (undefined = item background)
}

export interface BgEntry {
  id: string
  name: string
  group: 'solid' | 'gradient' | 'animated' | 'media'
  background: SlideBackground
}

/** Background picked in the item's playlist, if any */
export function pickedBackground(item: ServiceItem): SlideBackground | undefined {
  return item.bgPlaylist?.find(e => e.id === item.activeBgId)?.background
}

/** DB song id of an item — older scenes only encoded it in the item id ("song_12_…") */
export function songIdOf(item: ServiceItem): number | undefined {
  if (item.type !== 'song') return undefined
  if (item.songId) return item.songId
  const m = item.id.match(/^song_(\d+)(?:_|$)/)
  return m ? Number(m[1]) : undefined
}

/** Per-song presenter defaults stored in songs.settings */
export interface SongSettings {
  background: SlideBackground
  textStyle: TextStyle
  groupAnimations?: Record<string, TextAnimation>
  bgPlaylist?: BgEntry[]
  activeBgId?: string
}

/** Drop session-only blob: URLs — they are dead after a reload */
export function stripBlobUrls<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_k, v) =>
    typeof v === 'string' && v.startsWith('blob:') ? undefined : v)) as T
}

export function songSettingsOf(item: ServiceItem): SongSettings {
  return stripBlobUrls({
    background: item.background,
    textStyle: item.textStyle,
    groupAnimations: item.groupAnimations,
    bgPlaylist: item.bgPlaylist,
    activeBgId: item.activeBgId,
  })
}

/** "Verse 2" → "Verse" — all slides of the same group type share one animation */
export function animGroupKey(label: string): string {
  return label.replace(/\s*\d+\s*$/, '').trim() || label
}

/** Effective text style of a slide: item style ← group animation ← slide override */
export function resolveTextStyle(item: ServiceItem, slide?: Slide | null): TextStyle {
  const base = slide?.textStyleOverride ? { ...item.textStyle, ...slide.textStyleOverride } : item.textStyle
  const groupAnim = slide ? item.groupAnimations?.[animGroupKey(slide.label)] : undefined
  if (groupAnim && !slide?.textStyleOverride?.animation) return { ...base, animation: groupAnim }
  return base
}

// ── Live video: the Output player is the master (picture + audio); the Center panel is a remote ──

export interface MediaControl {
  playing: boolean
  muted: boolean
  volume: number            // 0–1
  loop: boolean
  /** One-shot seek request; applied once per nonce, only to the matching video url */
  seek: { url: string; time: number; nonce: number } | null
}

export interface MediaStatus {
  url: string | null
  currentTime: number
  duration: number
  ended: boolean
}

export const DEFAULT_MEDIA_CONTROL: MediaControl = {
  playing: true, muted: false, volume: 1, loop: false, seek: null,
}
