import { WebSocketServer, WebSocket } from 'ws'
import type { SyncMessage, ServerState } from './types.js'

export interface SyncServerOptions {
  port?: number
  host?: string
  onMessage?: (msg: SyncMessage, clientId: string) => void
  onClientConnect?: (clientId: string) => void
  onClientDisconnect?: (clientId: string) => void
}

export class EasyChurchSyncServer {
  private wss: WebSocketServer | null = null
  private clients = new Map<string, WebSocket>()
  private state: ServerState = {
    currentPlaylistId: null,
    currentItemIndex: 0,
    currentSlideIndex: 0,
    isBlank: false,
    connectedClients: 0,
  }
  private opts: Required<SyncServerOptions>
  private pingInterval: ReturnType<typeof setInterval> | null = null

  constructor(opts: SyncServerOptions = {}) {
    this.opts = {
      port: opts.port ?? 7777,
      host: opts.host ?? '0.0.0.0',
      onMessage: opts.onMessage ?? (() => {}),
      onClientConnect: opts.onClientConnect ?? (() => {}),
      onClientDisconnect: opts.onClientDisconnect ?? (() => {}),
    }
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.opts.port, host: this.opts.host })

      this.wss.on('listening', () => {
        console.log(`[Sync] Server listening on ws://${this.opts.host}:${this.opts.port}`)
        this.startPing()
        resolve()
      })

      this.wss.on('error', reject)

      this.wss.on('connection', (ws, req) => {
        const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        this.clients.set(clientId, ws)
        this.state.connectedClients = this.clients.size

        // Send current state to new client
        this.sendTo(clientId, { type: 'server:state', payload: this.state, timestamp: Date.now() })
        this.opts.onClientConnect(clientId)

        ws.on('message', (raw) => {
          try {
            const msg = JSON.parse(raw.toString()) as SyncMessage
            if (msg.type === 'ping') {
              this.sendTo(clientId, { type: 'pong', timestamp: Date.now() })
              return
            }
            this.opts.onMessage(msg, clientId)
          } catch {
            // malformed message — ignore
          }
        })

        ws.on('close', () => {
          this.clients.delete(clientId)
          this.state.connectedClients = this.clients.size
          this.opts.onClientDisconnect(clientId)
        })

        ws.on('error', () => {
          this.clients.delete(clientId)
          this.state.connectedClients = this.clients.size
        })
      })
    })
  }

  broadcast(msg: SyncMessage): void {
    const data = JSON.stringify(msg)
    for (const ws of this.clients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    }
  }

  sendTo(clientId: string, msg: SyncMessage): void {
    const ws = this.clients.get(clientId)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }

  updateState(partial: Partial<ServerState>): void {
    this.state = { ...this.state, ...partial }
    this.broadcast({ type: 'server:state', payload: this.state, timestamp: Date.now() })
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.broadcast({ type: 'ping', timestamp: Date.now() })
    }, 30_000)
  }

  async stop(): Promise<void> {
    if (this.pingInterval) clearInterval(this.pingInterval)
    return new Promise((resolve) => {
      if (!this.wss) { resolve(); return }
      this.wss.close(() => resolve())
    })
  }

  get connectedCount(): number {
    return this.clients.size
  }
}
