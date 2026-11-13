declare global {
  interface NativeDisplay {
    id: number
    label: string
    bounds: { x: number; y: number; width: number; height: number }
    isPrimary: boolean
    /** Physical connector reported by Windows (HDMI / DVI / VGA / DisplayPort / SDI / Internal …) — null if unknown */
    connector: string | null
  }

  interface NativeSettings {
    output: {
      display1: { enabled: boolean; displayId: number | null }
      display2: { enabled: boolean; displayId: number | null; mode: string }
    }
    performance: { hardwareAcceleration: boolean; gpuRasterization: boolean; maxMemoryMB: number }
  }

  interface ElectronAPI {
    sendSlideCommand: (data: unknown) => void
    onSlideCommand: (cb: (data: unknown) => void) => () => void
    getDisplays: () => Promise<NativeDisplay[]>
    /** Persist native settings (read at startup) and (re)open output windows */
    applyNativeSettings?: (s: NativeSettings) => Promise<void>
    /** GPU feature status from Chromium */
    getGpuInfo?: () => Promise<Record<string, string>>
    relaunch?: () => void
  }

  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
