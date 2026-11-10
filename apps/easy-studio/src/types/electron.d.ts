export interface LowerThirdStyle {
  bgColor: string
  textColor: string
  accentColor: string
  position: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-right'
  animation: 'slide-up' | 'fade' | 'none'
}

export interface OverlayCommand {
  type: 'lower-third' | 'clear' | 'title'
  name?: string
  title?: string
  subtitle?: string
  style?: LowerThirdStyle
}

export interface DisplayInfo {
  id: number
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  isPrimary: boolean
}

export interface StudioElectronAPI {
  sendOverlay: (data: OverlayCommand) => void
  onOverlayCommand: (cb: (data: OverlayCommand) => void) => () => void
  onStageUpdate: (cb: (data: unknown) => void) => () => void
  sendPtzCommand: (cameraId: string, payload: number[]) => Promise<{ ok: boolean; error?: string }>
  recallPreset: (cameraId: string, presetId: number) => Promise<{ ok: boolean; error?: string }>
  addCamera: (config: unknown) => Promise<{ ok: boolean; error?: string }>
  removeCamera: (id: string) => Promise<void>
  getDisplays: () => Promise<DisplayInfo[]>
  showOverlayWindow: (show: boolean) => Promise<void>
  showStageWindow: (show: boolean) => Promise<void>
  sendStageUpdate: (data: unknown) => void
}

declare global {
  interface Window {
    studioAPI?: StudioElectronAPI
    Capacitor?: { isNativePlatform: () => boolean }
  }
}
