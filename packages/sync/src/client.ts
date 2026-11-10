import WebSocket from 'ws'
import type { SyncMessage, ServerState, SyncEventType } from './types.js'

type EventHandler = (payload: unknown) => void

export class EasyChurchSyncClient {
  private ws: WebSocket | null = null
  private handlers = new Map<SyncEventType, Set<EventHandler>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private isConnecting = false
  private shouldReconnect = true
  private url: string
  private lastState: ServerState | null = null

  constructor(host: string, port = 7777) {
    this.url = `ws://${host}:${port}`
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting) return
      this.isConnecting = true

      this.ws = new WebSocket(this.url)

      this.ws.on('open', () => {
        this.isConnecting = false
        console.log(`[SyncClient] Connected to ${this.url}`)
        resolve()
      })

      this.ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as SyncMessage
          if (msg.type === 'server:state') {
            this.lastState = msg.payload as ServerState
          }
          if (msg.type === 'ping') {
            this.send({ type: 'pong', timestamp: Date.now() })
            return
          }
          const handlers = this.handlers.get(msg.type)
          if (handlers) {
            for (const h of handlers) h(msg.payload)
          }
        } catch {
          // ignore
        }
      })

      this.ws.on('error', (err) => {
        this.isConnecting = false
        reject(err)
      })

      this.ws.on('close', () => {
        this.isConnecting = false
        if (this.shouldReconnect) {
          this.reconnectTimer = setTimeout(() => this.connect().catch(() => {}), 3000)
        }
      })
    })
  }

  on(event: SyncEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
    return () => this.handlers.get(event)?.delete(handler)
  }

  send(msg: SyncMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
  }

  get state(): ServerState | null {
    return this.lastState
  }
}
