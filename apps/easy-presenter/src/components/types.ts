export type ItemType = 'song' | 'scripture' | 'announcement' | 'media'
export type MediaType = 'image' | 'video' | 'ppt' | 'pdf'
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
  textAlign: TextAlignMode
  verticalPosition: VerticalPosition
  positionOffset: number    // extra px from edge (top→top offset, bottom→bottom offset)
  color: string
  shadow: boolean
  outline: boolean
  outlineColor: string
  lineHeight: number        // 1.0–3.0
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
}
