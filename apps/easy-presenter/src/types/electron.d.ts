interface ElectronAPI {
  sendSlideCommand: (data: unknown) => void
  onSlideCommand: (cb: (data: unknown) => void) => () => void
  getDisplays: () => Promise<Array<{
    id: number
    label: string
    bounds: { x: number; y: number; width: number; height: number }
    isPrimary: boolean
  }>>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
