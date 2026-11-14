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
    getDisplays: () => Promise<NativeDisplay[]>
    /** Monitor plugged / unplugged; returns an unsubscribe function */
    onDisplaysChanged?: (cb: () => void) => () => void
    /** Persist native settings (read at startup) and (re)open output windows */
    applyNativeSettings?: (s: NativeSettings) => Promise<void>
    /** GPU feature status from Chromium */
    getGpuInfo?: () => Promise<Record<string, string>>
    relaunch?: () => void
    /** Phone remote: push the operator snapshot (JSON) to connected phones */
    remoteSendState?: (json: string) => void
    remoteInfo?: () => Promise<RemoteInfo | null>
    /** New Operator / Speaker keys — old phone links stop working */
    remoteRegenerate?: () => Promise<RemoteInfo | null>
    onRemoteCommand?: (cb: (cmd: unknown) => void) => () => void
    onRemoteClients?: (cb: (clients: RemoteInfo['clients']) => void) => () => void
  }

  interface RemoteInfo {
    port: number
    addresses: { name: string; address: string }[]
    keys: { operator: string; speaker: string }
    clients: { operator: number; speaker: number }
  }

  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
