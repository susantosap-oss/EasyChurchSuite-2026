// Application-wide presenter defaults (Settings ⚙). Stored in app_settings as JSON.
import type { SlideBackground, TextAnimation, TextStyle, ServiceItem, VerticalPosition } from '../types'
import { DEFAULT_TEXT_STYLE, DEFAULT_SONG_BG, DEFAULT_SCRIPTURE_BG, DEFAULT_TEXT_ANIMATION } from '../types'

export type TextPosition = 'top' | 'center' | 'bottom'

export interface DisplayTextSettings {
  fontFamily: string
  bold: boolean
  italic: boolean
  shadow: boolean
  fontSize: number          // px @ 1920-wide design
  position: TextPosition
}

export interface DisplaySettings {
  text: DisplayTextSettings
  songBackground: SlideBackground
  scriptureBackground: SlideBackground
}

/**
 * How Display 2 renders the live slide:
 * - custom: own font / position / backgrounds (Display 2 settings)
 * - mirror: identical to Display 1
 */
export type Display2Mode = 'custom' | 'mirror'

export interface OutputTarget {
  enabled: boolean
  displayId: number | null   // Electron display id; null = auto (first secondary screen)
}

export interface VideoLimits {
  autoConvert: boolean
  maxHeight: 720 | 1080 | 2160
  maxBitrateKbps: number
  maxFps: 30 | 60
  keepOriginal: boolean
}

export interface AppSettings {
  display1: DisplaySettings
  display2: DisplaySettings
  /** Default text animation per song group on Display 1 (null = none) */
  animations: { verse: TextAnimation | null; chorus: TextAnimation | null; bridge: TextAnimation | null }
  output: {
    display1: OutputTarget
    display2: OutputTarget & { mode: Display2Mode }
  }
  performance: {
    hardwareAcceleration: boolean   // GPU compositing (restart required)
    gpuRasterization: boolean       // rasterize on GPU (restart required)
    maxMemoryMB: number             // V8 heap limit per window (restart required)
    /** Lighter rendering for low-end PCs: no text loop effects, no live video preview in the center panel */
    lowSpecMode: boolean
    /** Uploaded videos above these limits are converted to H.264 MP4 (needs FFmpeg) */
    video: VideoLimits
  }
  /** Reserved — NDI output is not implemented yet (needs the NDI SDK native addon) */
  ndi: { enabled: boolean; sourceName: string }
}

const DEFAULT_TEXT: DisplayTextSettings = {
  fontFamily: DEFAULT_TEXT_STYLE.fontFamily,
  bold: false,
  italic: false,
  shadow: true,
  fontSize: DEFAULT_TEXT_STYLE.fontSize,
  position: 'center',
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  display1: { text: { ...DEFAULT_TEXT }, songBackground: DEFAULT_SONG_BG, scriptureBackground: DEFAULT_SCRIPTURE_BG },
  display2: {
    text: { ...DEFAULT_TEXT, fontSize: 56, position: 'bottom' },
    songBackground: { type: 'solid', color: '#000000' },
    scriptureBackground: { type: 'solid', color: '#000000' },
  },
  animations: { verse: null, chorus: null, bridge: null },
  output: {
    display1: { enabled: true, displayId: null },
    display2: { enabled: false, displayId: null, mode: 'custom' },
  },
  performance: {
    hardwareAcceleration: true, gpuRasterization: true, maxMemoryMB: 4096, lowSpecMode: false,
    video: { autoConvert: true, maxHeight: 1080, maxBitrateKbps: 12000, maxFps: 30, keepOriginal: false },
  },
  ndi: { enabled: false, sourceName: 'EasyPresenter' },
}

/** Fill gaps from older saved JSON with defaults (one level deep per section) */
export function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const d = DEFAULT_APP_SETTINGS
  const r = raw ?? {}
  const disp = (x: Partial<DisplaySettings> | undefined, def: DisplaySettings): DisplaySettings => ({
    ...def, ...x, text: { ...def.text, ...x?.text },
  })
  return {
    display1: disp(r.display1, d.display1),
    display2: disp(r.display2, d.display2),
    animations: { ...d.animations, ...r.animations },
    output: {
      display1: { ...d.output.display1, ...r.output?.display1 },
      display2: { ...d.output.display2, ...r.output?.display2 },
    },
    performance: { ...d.performance, ...r.performance, video: { ...d.performance.video, ...r.performance?.video } },
    ndi: { ...d.ndi, ...r.ndi },
  }
}

const POSITION_MAP: Record<TextPosition, VerticalPosition> = { top: 'top', center: 'center', bottom: 'bottom' }

/** Display text settings → the fields of TextStyle they control */
export function textSettingsToStyle(t: DisplayTextSettings): Partial<TextStyle> {
  return {
    fontFamily: t.fontFamily,
    fontWeight: t.bold ? 'bold' : 'normal',
    fontStyle: t.italic ? 'italic' : 'normal',
    shadow: t.shadow,
    fontSize: t.fontSize,
    verticalPosition: POSITION_MAP[t.position],
  }
}

/** Text style for a new item, from Display 1 defaults */
export function defaultTextStyle(s: AppSettings): TextStyle {
  return { ...DEFAULT_TEXT_STYLE, ...textSettingsToStyle(s.display1.text) }
}

/** Group animations for a new song, from the Verse / Chorus / Bridge defaults */
export function defaultGroupAnimations(s: AppSettings): Record<string, TextAnimation> | undefined {
  const out: Record<string, TextAnimation> = {}
  if (s.animations.verse)  out.Verse  = s.animations.verse
  if (s.animations.chorus) { out.Chorus = s.animations.chorus; out.Reff = s.animations.chorus }
  if (s.animations.bridge) out.Bridge = s.animations.bridge
  return Object.keys(out).length ? out : undefined
}

/** Apply app defaults to a freshly created song / scripture item (before any saved song settings) */
export function applyAppDefaults(item: ServiceItem, s: AppSettings): ServiceItem {
  if (item.type === 'song') {
    return {
      ...item,
      background: { ...s.display1.songBackground },
      textStyle: defaultTextStyle(s),
      groupAnimations: defaultGroupAnimations(s),
    }
  }
  if (item.type === 'scripture') {
    return { ...item, background: { ...s.display1.scriptureBackground }, textStyle: defaultTextStyle(s) }
  }
  return item
}

/** Animation presets offered in Settings (same family as the Animasi Teks panel) */
export const ANIMATION_PRESETS: { name: string; anim: TextAnimation | null }[] = [
  { name: 'Tidak ada',    anim: null },
  { name: 'Fade',         anim: { ...DEFAULT_TEXT_ANIMATION, enter: 'fade', unit: 'slide', duration: 600 } },
  { name: 'Smooth',       anim: { ...DEFAULT_TEXT_ANIMATION, enter: 'fade', unit: 'line', duration: 700, stagger: 150 } },
  { name: 'Zoom In',      anim: { ...DEFAULT_TEXT_ANIMATION, enter: 'zoom-in', unit: 'slide', duration: 600 } },
  { name: 'Slide Up',     anim: { ...DEFAULT_TEXT_ANIMATION, enter: 'slide-up', unit: 'line', duration: 600, stagger: 120 } },
  { name: 'Worship Glow', anim: { ...DEFAULT_TEXT_ANIMATION, enter: 'blur', loop: 'glow', unit: 'word', duration: 700, stagger: 80, loopSpeed: 3 } },
  { name: 'Neon Night',   anim: { ...DEFAULT_TEXT_ANIMATION, enter: 'fade', loop: 'neon', unit: 'slide', duration: 500, loopSpeed: 4, glowColor: '#e879f9' } },
  { name: 'Karaoke Pop',  anim: { ...DEFAULT_TEXT_ANIMATION, enter: 'pop', unit: 'char', duration: 400, stagger: 25 } },
  { name: 'Pulse',        anim: { ...DEFAULT_TEXT_ANIMATION, enter: 'fade', loop: 'pulse', unit: 'slide', duration: 500, loopSpeed: 2 } },
]

export function presetNameOf(anim: TextAnimation | null): string {
  if (!anim) return 'Tidak ada'
  return ANIMATION_PRESETS.find(p => p.anim && JSON.stringify(p.anim) === JSON.stringify(anim))?.name ?? 'Kustom'
}
