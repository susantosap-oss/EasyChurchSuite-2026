import { app, BrowserWindow, screen, ipcMain, dialog, type Display } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, createWriteStream } from 'fs'
import { execFile, spawn, type ChildProcess } from 'child_process'
import http from 'http'
import net from 'net'
import { RemoteServer } from './remote'

// One running instance only — a second copy would start a second server on the same data
if (!app.requestSingleInstanceLock()) app.quit()

// ── Native settings (written by the renderer via Settings ⚙, read before app start) ──

interface OutputTarget { enabled: boolean; displayId: number | null }
interface NativeSettings {
  output: { display1: OutputTarget; display2: OutputTarget & { mode: string } }
  performance: { hardwareAcceleration: boolean; gpuRasterization: boolean; maxMemoryMB: number }
}

const DEFAULT_NATIVE: NativeSettings = {
  output: {
    display1: { enabled: true, displayId: null },
    display2: { enabled: false, displayId: null, mode: 'custom' },
  },
  performance: { hardwareAcceleration: true, gpuRasterization: true, maxMemoryMB: 4096 },
}

const SETTINGS_FILE = join(app.getPath('userData'), 'presenter-native.json')

function loadNative(): NativeSettings {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const raw = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')) as Partial<NativeSettings>
      return {
        output: { ...DEFAULT_NATIVE.output, ...raw.output },
        performance: { ...DEFAULT_NATIVE.performance, ...raw.performance },
      }
    }
  } catch { /* corrupt file → defaults */ }
  return DEFAULT_NATIVE
}

let native = loadNative()

// Installed app: FFmpeg ships in resources/ffmpeg (video conversion for low-end PCs).
// The Next.js server finds it through this variable; dev falls back to FFmpeg on PATH.
const bundledFfmpeg = join(process.resourcesPath ?? '', 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
if (app.isPackaged && existsSync(bundledFfmpeg)) process.env.EASYCHURCH_FFMPEG = bundledFfmpeg

// GPU / memory flags must be set before the app is ready (changes need a restart)
if (!native.performance.hardwareAcceleration) {
  app.disableHardwareAcceleration()
} else if (native.performance.gpuRasterization) {
  app.commandLine.appendSwitch('enable-gpu-rasterization')
  app.commandLine.appendSwitch('enable-zero-copy')
}
app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${native.performance.maxMemoryMB}`)
// Keep output animations / video running when windows are not focused
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')

// ── Windows ──

let operatorWindow: BrowserWindow | null = null
const outputWindows = new Map<1 | 2, BrowserWindow>()

const isDev = !app.isPackaged
const DEV_URL = 'http://localhost:3001'
let baseUrl = DEV_URL   // installed app: the bundled server on 127.0.0.1:<free port>
let serverProcess: ChildProcess | null = null

// ── Bundled server (installed app) ──

function findFreePort(preferred: number): Promise<number> {
  return new Promise(resolve => {
    const srv = net.createServer()
    srv.once('error', () => {
      const any = net.createServer()
      any.listen(0, '127.0.0.1', () => {
        const port = (any.address() as net.AddressInfo).port
        any.close(() => resolve(port))
      })
    })
    srv.listen(preferred, '127.0.0.1', () => srv.close(() => resolve(preferred)))
  })
}

function waitForHttp(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const attempt = () => {
      http.get(url, res => { res.resume(); resolve() })
        .on('error', () => {
          if (Date.now() > deadline) reject(new Error('Server tidak merespons'))
          else setTimeout(attempt, 300)
        })
    }
    attempt()
  })
}

/** Start the bundled Next.js server with Electron's Node; data lives in %APPDATA%/EasyChurch Suite/data */
async function startBundledServer(): Promise<string> {
  const resources = process.resourcesPath
  const serverJs  = join(resources, 'server', 'apps', 'easy-presenter', 'server.js')
  const dataDir   = join(app.getPath('userData'), 'data')
  const dbPath    = join(dataDir, 'easy_bible.db')
  mkdirSync(dataDir, { recursive: true })
  // First run: copy the starter database (TB + KJV) out of the read-only install folder
  if (!existsSync(dbPath)) copyFileSync(join(resources, 'seed', 'easy_bible.db'), dbPath)

  const port = await findFreePort(3901)
  const log  = createWriteStream(join(app.getPath('userData'), 'server.log'), { flags: 'w' })
  serverProcess = spawn(process.execPath, [serverJs], {
    cwd: dirname(serverJs),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      DB_PATH: dbPath,
      NODE_OPTIONS: `--max-old-space-size=${native.performance.maxMemoryMB}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  serverProcess.stdout?.pipe(log)
  serverProcess.stderr?.pipe(log)

  const url = `http://127.0.0.1:${port}`
  await waitForHttp(`${url}/api/settings/`, 45_000)
  return url
}

const SPLASH = 'data:text/html;charset=utf-8,' + encodeURIComponent(
  '<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;' +
  'background:#0f172a;color:#94a3b8;font-family:Segoe UI,sans-serif">Memulai EasyChurch Suite…</body>')

const webPreferences = () => ({
  nodeIntegration: false,
  contextIsolation: true,
  preload: join(__dirname, 'preload.js'),
  backgroundThrottling: false,
})

function createOperatorWindow() {
  operatorWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset',
    frame: process.platform !== 'darwin',
    webPreferences: webPreferences(),
    title: 'EasyChurch Suite',
    show: false,
  })

  operatorWindow.once('ready-to-show', () => operatorWindow!.maximize())
  operatorWindow.loadURL(isDev ? DEV_URL : SPLASH)

  operatorWindow.on('closed', () => {
    operatorWindow = null
    outputWindows.forEach(w => w.close())
  })
}

/** Display for output N: the chosen one, else the Nth secondary screen; null when only one screen exists */
function pickDisplay(n: 1 | 2, wantedId: number | null): Display | null {
  const all = screen.getAllDisplays()
  const primary = screen.getPrimaryDisplay()
  if (wantedId != null) {
    const d = all.find(x => x.id === wantedId)
    if (d) return d
  }
  const secondary = all.filter(d => d.id !== primary.id)
  return secondary[n - 1] ?? secondary[0] ?? null
}

function openOutput(n: 1 | 2, displayId: number | null) {
  const display = pickDisplay(n, displayId)
  // Single screen (laptop without projector): a floating output window would cover the
  // operator UI, and the OUTPUT preview in the right panel already shows the same thing
  if (!display) { outputWindows.get(n)?.close(); return }
  let win = outputWindows.get(n)

  if (!win || win.isDestroyed()) {
    win = new BrowserWindow({
      backgroundColor: '#000000',
      frame: false,
      webPreferences: webPreferences(),
      title: `EasyChurch Suite Output ${n}`,
      show: false,
      skipTaskbar: true,
    })
    win.loadURL(`${baseUrl}/output/?display=${n}`)
    const created = win
    win.once('ready-to-show', () => created.show())
    win.on('closed', () => { if (outputWindows.get(n) === created) outputWindows.delete(n) })
    outputWindows.set(n, win)
  }

  win.setFullScreen(false)
  win.setBounds(display.bounds)
  win.setFullScreen(true)
}

function applyOutputs(s: NativeSettings) {
  ;([1, 2] as const).forEach(n => {
    const t = s.output[`display${n}`]
    if (t.enabled) openOutput(n, t.displayId)
    else outputWindows.get(n)?.close()
  })
}

// ── Connector detection (Windows WMI: VideoOutputTechnology) ──

const OUTPUT_TECH: Record<number, string> = {
  0: 'VGA', 1: 'S-Video', 2: 'Composite', 3: 'Component', 4: 'DVI', 5: 'HDMI', 6: 'LVDS',
  8: 'D-Jpn', 9: 'SDI', 10: 'DisplayPort', 11: 'DisplayPort', 12: 'UDI', 13: 'UDI',
  14: 'SDTV', 15: 'Miracast', 16: 'Wired', 2147483648: 'Internal',
}

interface WmiMonitor { name: string; tech: number }
let connectorCache: WmiMonitor[] | null = null

function detectConnectors(): Promise<WmiMonitor[]> {
  if (connectorCache) return Promise.resolve(connectorCache)
  if (process.platform !== 'win32') return Promise.resolve([])
  const ps = [
    '$c = Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorConnectionParams -ErrorAction SilentlyContinue',
    '$i = Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorID -ErrorAction SilentlyContinue',
    '@($c | ForEach-Object { $inst = $_.InstanceName; $id = $i | Where-Object { $_.InstanceName -eq $inst } | Select-Object -First 1;',
    '  $name = if ($id) { -join ($id.UserFriendlyName | Where-Object { $_ -ne 0 } | ForEach-Object { [char]$_ }) } else { "" };',
    '  [pscustomobject]@{ name = $name; tech = [int64]$_.VideoOutputTechnology } }) | ConvertTo-Json -Compress',
  ].join(' ')
  return new Promise(resolve => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { timeout: 10_000 }, (err, stdout) => {
      if (err || !stdout.trim()) { resolve([]); return }
      try {
        const parsed = JSON.parse(stdout) as WmiMonitor | WmiMonitor[]
        connectorCache = (Array.isArray(parsed) ? parsed : [parsed])
          .map(m => ({ ...m, name: (m.name ?? '').replace(/\u0000/g, '').trim() }))
      } catch { connectorCache = [] }
      resolve(connectorCache)
    })
  })
}

async function listDisplays() {
  const all = screen.getAllDisplays()
  const primaryId = screen.getPrimaryDisplay().id
  const wmi = await detectConnectors()
  return all.map((d, idx) => {
    const label = d.label || `Display ${idx + 1}`
    // Match Electron's monitor name with the WMI friendly name; fall back to enumeration order
    const byName = wmi.find(m => m.name && label.toLowerCase().includes(m.name.toLowerCase()))
    const match  = byName ?? (wmi.length === all.length ? wmi[idx] : undefined)
    return {
      id: d.id,
      label,
      bounds: d.bounds,
      isPrimary: d.id === primaryId,
      connector: match ? (OUTPUT_TECH[match.tech] ?? 'Other') : (d.internal ? 'Internal' : null),
    }
  })
}

// ── IPC ──

ipcMain.handle('app:get-displays', () => listDisplays())

ipcMain.handle('settings:apply-native', (_event, s: NativeSettings) => {
  native = { output: { ...DEFAULT_NATIVE.output, ...s.output }, performance: { ...DEFAULT_NATIVE.performance, ...s.performance } }
  try { writeFileSync(SETTINGS_FILE, JSON.stringify(native, null, 2)) } catch { /* read-only profile */ }
  applyOutputs(native)
})

ipcMain.handle('app:gpu-info', () => app.getGPUFeatureStatus() as unknown as Record<string, string>)

// ── Phone remote (Operator / Speaker) ──

let remote: RemoteServer | null = null
// The operator may send its first state before the remote server is listening
let lastRemoteState = '{}'

function startRemote() {
  // build/icon.png in dev; copied next to dist-electron as assets/icon.png in the installed app
  const iconPath = join(__dirname, app.isPackaged ? '../assets/icon.png' : '../build/icon.png')
  remote = new RemoteServer(
    join(app.getPath('userData'), 'remote.json'),
    existsSync(iconPath) ? readFileSync(iconPath) : null,
    cmd => operatorWindow?.webContents.send('remote:command', cmd),
    clients => operatorWindow?.webContents.send('remote:clients', clients),
    path => new Promise((resolve, reject) => {
      http.get(baseUrl + path, res => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', chunk => { body += chunk })
        res.on('end', () => resolve(body))
      }).on('error', reject)
    }),
    (path, out) => {
      http.get(baseUrl + path, res => {
        out.writeHead(res.statusCode ?? 502, {
          'Content-Type': res.headers['content-type'] ?? 'application/octet-stream',
          'Cache-Control': 'max-age=3600',
        })
        res.pipe(out)
      }).on('error', () => { out.writeHead(502); out.end() })
    },
  )
  remote.start().then(() => remote?.setSnapshot(lastRemoteState)).catch(() => { remote = null })
}

ipcMain.on('remote:state', (_event, json: string) => {
  lastRemoteState = json
  remote?.setSnapshot(json)
})
ipcMain.handle('remote:info', () => remote?.info() ?? null)
ipcMain.handle('remote:regenerate', () => remote?.regenerateKeys() ?? null)

ipcMain.on('app:relaunch', () => {
  app.relaunch()
  app.exit(0)
})

app.on('second-instance', () => {
  if (operatorWindow) { if (operatorWindow.isMinimized()) operatorWindow.restore(); operatorWindow.focus() }
})

app.whenReady().then(async () => {
  createOperatorWindow()
  if (!isDev) {
    try {
      baseUrl = await startBundledServer()
      await operatorWindow?.loadURL(baseUrl)
    } catch (err) {
      dialog.showErrorBox('EasyChurch Suite gagal mulai',
        `${err instanceof Error ? err.message : String(err)}

Log: ${join(app.getPath('userData'), 'server.log')}`)
      app.quit()
      return
    }
  }
  applyOutputs(native)
  startRemote()

  // Monitor plugged / unplugged → re-place output windows
  const replace = () => {
    connectorCache = null
    applyOutputs(native)
    operatorWindow?.webContents.send('displays:changed')
  }
  screen.on('display-added', replace)
  screen.on('display-removed', replace)

  app.on('activate', () => {
    if (!operatorWindow) createOperatorWindow()
  })
})

app.on('will-quit', () => { serverProcess?.kill(); remote?.stop() })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
