export interface CameraConfig {
  id: string
  name: string
  host: string
  port: number       // typically 52381 for VISCA over IP
  protocol: 'tcp' | 'udp'
}

export interface PTZPreset {
  id: number         // 0-254 (VISCA preset number)
  name: string
  cameraId: string
  thumbnail?: string // base64 image snapshot
}

export interface PanTiltSpeed {
  pan: number   // 1-24
  tilt: number  // 1-20
}

export type ZoomDirection = 'tele' | 'wide' | 'stop'
export type FocusMode = 'auto' | 'manual'
