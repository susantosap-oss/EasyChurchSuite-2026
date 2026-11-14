// Phone remote (Operator / Speaker) — a small HTTP server on the church Wi-Fi.
// It serves only the remote page and its live feed; the app's own server (songs, settings,
// database) stays on 127.0.0.1. Each role has its own key, so a Speaker link cannot control.
import http from 'http'
import os from 'os'
import crypto from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { remotePage } from './remotePage'

export type RemoteRole = 'operator' | 'speaker'

export interface RemoteInfo {
  port: number
  /** LAN IPv4 addresses phones can reach (Wi-Fi first) */
  addresses: { name: string; address: string }[]
  keys: Record<RemoteRole, string>
  clients: Record<RemoteRole, number>
}

interface Stored { port: number; keys: Record<RemoteRole, string> }

const PREFERRED_PORT = 3902
const MAX_BODY = 16 * 1024
/** The Speaker may only open / step the presentations the operator marked for it */
const SPEAKER_COMMANDS = new Set(['deck', 'deckStep'])
/** Pictures phones may load through the remote: rendered presentation pages and library media */
const IMAGE_PATH = /^\/api\/(slides|media)\/file\/[^?#]+$/
/** Pass-through service worker: no offline cache (the remote is live-only), but it makes the page installable */
const SERVICE_WORKER = "self.addEventListener('install',function(){self.skipWaiting()});" +
  "self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});" +
  "self.addEventListener('fetch',function(){});"

const newKey = () => crypto.randomBytes(9).toString('base64url')

/** IPv4 LAN addresses, Wi-Fi / Ethernet before virtual adapters */
function lanAddresses(): RemoteInfo['addresses'] {
  const out: RemoteInfo['addresses'] = []
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) out.push({ name, address: a.address })
    }
  }
  const rank = (n: string) => /wi-?fi|wlan|wireless/i.test(n) ? 0 : /ethernet|^eth|^en/i.test(n) ? 1 : /vethernet|virtual|vmware|vbox|hyper-v|loopback/i.test(n) ? 3 : 2
  return out.sort((a, b) => rank(a.name) - rank(b.name))
}

export class RemoteServer {
  private server: http.Server | null = null
  private stored: Stored
  private port = PREFERRED_PORT
  private snapshot = '{}'
  private clients = new Set<{ role: RemoteRole; res: http.ServerResponse }>()
  private ping: NodeJS.Timeout | null = null

  constructor(
    private readonly storeFile: string,
    private readonly iconPng: Buffer | null,
    private readonly onCommand: (cmd: unknown) => void,
    private readonly onClientsChanged: (clients: RemoteInfo['clients']) => void,
    /** GET a path on the app's local server (only the whitelisted Bible lookups below) */
    private readonly lookup: (path: string) => Promise<string>,
    /** Stream a file from the app's local server to the phone (only IMAGE_PATH) */
    private readonly proxy: (path: string, res: http.ServerResponse) => void,
  ) {
    this.stored = this.load()
  }

  private load(): Stored {
    try {
      if (existsSync(this.storeFile)) {
        const s = JSON.parse(readFileSync(this.storeFile, 'utf8')) as Partial<Stored>
        if (s.keys?.operator && s.keys?.speaker) return { port: s.port ?? PREFERRED_PORT, keys: s.keys }
      }
    } catch { /* corrupt → new keys */ }
    const fresh = { port: PREFERRED_PORT, keys: { operator: newKey(), speaker: newKey() } }
    this.save(fresh)
    return fresh
  }

  private save(s: Stored) {
    try { writeFileSync(this.storeFile, JSON.stringify(s, null, 2)) } catch { /* read-only profile */ }
  }

  /** Listen on all interfaces; keeps the saved port so phone shortcuts keep working */
  async start(): Promise<void> {
    const tryPort = (port: number) => new Promise<boolean>(resolve => {
      const srv = http.createServer((req, res) => this.handle(req, res))
      srv.once('error', () => resolve(false))
      srv.listen(port, '0.0.0.0', () => { this.server = srv; this.port = port; resolve(true) })
    })
    for (let p = this.stored.port; p < this.stored.port + 10; p++) {
      if (await tryPort(p)) break
    }
    if (!this.server) throw new Error(`Port ${this.stored.port}–${this.stored.port + 9} terpakai`)
    if (this.port !== this.stored.port) this.save({ ...this.stored, port: this.port })
    // Keep idle connections alive through phone sleep / Wi-Fi power saving
    this.ping = setInterval(() => this.clients.forEach(c => c.res.write(': ping\n\n')), 20_000)
  }

  stop() {
    if (this.ping) clearInterval(this.ping)
    this.clients.forEach(c => c.res.end())
    this.server?.close()
  }

  info(): RemoteInfo {
    return { port: this.port, addresses: lanAddresses(), keys: this.stored.keys, clients: this.counts() }
  }

  /** New keys: old phone links stop working, connected phones are dropped */
  regenerateKeys(): RemoteInfo {
    this.stored = { ...this.stored, keys: { operator: newKey(), speaker: newKey() } }
    this.save(this.stored)
    this.clients.forEach(c => c.res.end())
    this.clients.clear()
    this.onClientsChanged(this.counts())
    return this.info()
  }

  /** Latest operator state (JSON) — pushed to every connected phone */
  setSnapshot(json: string) {
    if (json === this.snapshot) return
    this.snapshot = json
    this.clients.forEach(c => c.res.write(`data: ${json}\n\n`))
  }

  private counts(): RemoteInfo['clients'] {
    const n = { operator: 0, speaker: 0 }
    this.clients.forEach(c => { n[c.role]++ })
    return n
  }

  private roleOf(key: string | null): RemoteRole | null {
    if (!key) return null
    const eq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
    if (eq(key, this.stored.keys.operator)) return 'operator'
    if (eq(key, this.stored.keys.speaker)) return 'speaker'
    return null
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const url  = new URL(req.url ?? '/', 'http://remote')
    const role = this.roleOf(url.searchParams.get('k'))
    const send = (status: number, type: string, body: string | Buffer) => {
      res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
      res.end(body)
    }

    if (req.method === 'GET' && url.pathname === '/sw.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store', 'Service-Worker-Allowed': '/' })
      return res.end(SERVICE_WORKER)
    }

    if (req.method === 'GET' && url.pathname === '/icon.png') {
      if (!this.iconPng) return send(404, 'text/plain', 'no icon')
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400' })
      return res.end(this.iconPng)
    }

    if (!role) return send(403, 'text/html; charset=utf-8',
      '<meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;background:#0f172a;color:#cbd5e1;padding:24px">' +
      '<h3>Link tidak valid</h3><p>Scan ulang QR code dari menu 📱 Remote di EasyChurch Suite.</p></body>')

    const key = url.searchParams.get('k')!

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/r')) {
      return send(200, 'text/html; charset=utf-8', remotePage(role, key))
    }

    if (req.method === 'GET' && url.pathname === '/manifest.webmanifest') {
      return send(200, 'application/manifest+json', JSON.stringify({
        name: role === 'operator' ? 'EasyChurch Operator' : 'EasyChurch Speaker',
        short_name: role === 'operator' ? 'Operator' : 'Speaker',
        id: `/${role}`,
        start_url: `/r?k=${encodeURIComponent(key)}`,
        scope: '/',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        ],
      }))
    }

    if (req.method === 'GET' && url.pathname === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      })
      res.write(`retry: 2000\n\ndata: ${this.snapshot}\n\n`)
      const client = { role, res }
      this.clients.add(client)
      this.onClientsChanged(this.counts())
      req.on('close', () => { this.clients.delete(client); this.onClientsChanged(this.counts()) })
      return
    }

    // Operator Bible search + media list — read-only, fixed endpoints of the app's API
    if (req.method === 'GET' && (url.pathname === '/bible' || url.pathname === '/versions' || url.pathname === '/media')) {
      if (role !== 'operator') return send(403, 'application/json', '{"error":"speaker is read-only"}')
      const q = (url.searchParams.get('q') ?? '').slice(0, 80)
      const v = (url.searchParams.get('v') ?? 'TB').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16) || 'TB'
      const path = url.pathname === '/bible'  ? `/api/quick-search/?q=${encodeURIComponent(q)}&v=${encodeURIComponent(v)}`
                 : url.pathname === '/media'  ? '/api/media/'
                 : '/api/bible/versions/'
      this.lookup(path)
        .then(body => send(200, 'application/json', body))
        .catch(() => send(502, 'application/json', '{"found":false,"error":"Aplikasi tidak merespons"}'))
      return
    }

    // Presentation pages / images for the live view and preview (both roles)
    if (req.method === 'GET' && url.pathname === '/img') {
      const path = url.searchParams.get('u') ?? ''
      if (!IMAGE_PATH.test(path) || path.includes('..')) return send(400, 'text/plain', 'bad path')
      return this.proxy(path, res)
    }

    if (req.method === 'POST' && url.pathname === '/command') {
      let body = ''
      req.on('data', chunk => {
        body += chunk
        if (body.length > MAX_BODY) req.destroy()
      })
      req.on('end', () => {
        let cmd: { type?: unknown }
        try { cmd = JSON.parse(body) as { type?: unknown } } catch { return send(400, 'application/json', '{"error":"bad command"}') }
        if (role === 'speaker' && !SPEAKER_COMMANDS.has(String(cmd?.type))) {
          return send(403, 'application/json', '{"error":"speaker may only control its own presentations"}')
        }
        this.onCommand(cmd)
        send(200, 'application/json', '{"ok":true}')
      })
      return
    }

    send(404, 'text/plain', 'not found')
  }
}
