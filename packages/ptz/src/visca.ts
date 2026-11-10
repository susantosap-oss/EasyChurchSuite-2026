import { createConnection, Socket } from 'net'
import { createSocket } from 'dgram'
import type { CameraConfig } from './types.js'

// VISCA packet header for VISCA-over-IP (Sony/Marshall/PTZOptics format)
// Header: [0x01, 0x00, payload_len_hi, payload_len_lo, 0x00, 0x00, 0x00, sequence_num(4bytes)]
// But simpler cameras just use raw VISCA without IP header

/** Build a raw VISCA command packet (no IP header - for most PTZ cameras) */
function buildViscaPacket(payload: number[]): Buffer {
  return Buffer.from([0x81, ...payload, 0xFF])
}

/** Build VISCA-over-IP packet (with 8-byte IP header) */
function buildViscaIpPacket(payload: number[], seqNum = 1): Buffer {
  const viscaPayload = buildViscaPacket(payload)
  const header = Buffer.alloc(8)
  header[0] = 0x01
  header[1] = 0x00
  header[2] = 0x00
  header[3] = viscaPayload.length
  header.writeUInt32BE(seqNum, 4)
  return Buffer.concat([header, viscaPayload])
}

// ---- VISCA Command Payloads ----

export const VISCA = {
  recallPreset: (preset: number) => [0x01, 0x04, 0x3F, 0x02, preset & 0xFF],
  storePreset:  (preset: number) => [0x01, 0x04, 0x3F, 0x01, preset & 0xFF],

  panTiltHome: () => [0x01, 0x06, 0x04],
  panTiltReset: () => [0x01, 0x06, 0x05],

  panTiltMove: (panDir: 1|2|3, tiltDir: 1|2|3, panSpeed: number, tiltSpeed: number) => [
    0x01, 0x06, 0x01, panSpeed & 0x1F, tiltSpeed & 0x1F, panDir, tiltDir,
  ],
  panTiltStop: () => [0x01, 0x06, 0x01, 0x03, 0x03, 0x03, 0x03],

  zoomTele:  (speed = 5) => [0x01, 0x04, 0x07, 0x20 | (speed & 0x07)],
  zoomWide:  (speed = 5) => [0x01, 0x04, 0x07, 0x30 | (speed & 0x07)],
  zoomStop:  ()          => [0x01, 0x04, 0x07, 0x00],

  focusAuto:   () => [0x01, 0x04, 0x38, 0x02],
  focusManual: () => [0x01, 0x04, 0x38, 0x03],
  focusTrigger:() => [0x01, 0x04, 0x18, 0x01],

  powerOn:  () => [0x01, 0x04, 0x00, 0x02],
  powerOff: () => [0x01, 0x04, 0x00, 0x03],

  inquiry: {
    power:  () => [0x09, 0x04, 0x00],
    zoomPos:() => [0x09, 0x04, 0x47],
  },
}

// ---- Transport ----

export class ViscaCameraController {
  private socket: Socket | null = null
  private seqNum = 1
  private config: CameraConfig

  constructor(config: CameraConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    if (this.config.protocol === 'udp') return // UDP is connectionless

    return new Promise((resolve, reject) => {
      this.socket = createConnection(this.config.port, this.config.host, () => resolve())
      this.socket.on('error', reject)
      this.socket.setTimeout(5000)
    })
  }

  disconnect(): void {
    this.socket?.destroy()
    this.socket = null
  }

  async send(payload: number[]): Promise<void> {
    const packet = buildViscaIpPacket(payload, this.seqNum++)

    if (this.config.protocol === 'tcp') {
      return new Promise((resolve, reject) => {
        if (!this.socket) { reject(new Error('Not connected')); return }
        this.socket.write(packet, (err) => err ? reject(err) : resolve())
      })
    } else {
      // UDP
      return new Promise((resolve, reject) => {
        const sock = createSocket('udp4')
        sock.send(packet, 0, packet.length, this.config.port, this.config.host, (err) => {
          sock.close()
          err ? reject(err) : resolve()
        })
      })
    }
  }

  async recallPreset(presetId: number): Promise<void> {
    await this.send(VISCA.recallPreset(presetId))
  }

  async storePreset(presetId: number): Promise<void> {
    await this.send(VISCA.storePreset(presetId))
  }

  async panTiltHome(): Promise<void> {
    await this.send(VISCA.panTiltHome())
  }

  async panTiltStop(): Promise<void> {
    await this.send(VISCA.panTiltStop())
  }

  async zoomIn(speed = 5): Promise<void> {
    await this.send(VISCA.zoomTele(speed))
  }

  async zoomOut(speed = 5): Promise<void> {
    await this.send(VISCA.zoomWide(speed))
  }

  async zoomStop(): Promise<void> {
    await this.send(VISCA.zoomStop())
  }

  async focusAuto(): Promise<void> {
    await this.send(VISCA.focusAuto())
  }
}
