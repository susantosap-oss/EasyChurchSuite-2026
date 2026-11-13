import { app, BrowserWindow, screen, ipcMain, type Display } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { execFile } from 'child_process'
import squirrelStartup from 'electron-squirrel-startup'

if (squirrelStartup) app.quit()

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
const NEXT_URL = 'http://localhost:3001'
const DIST_PATH = join(__dirname, '../out')

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
    title: 'EasyPresenter',
    show: false,
  })

  operatorWindow.once('ready-to-show', () => operatorWindow!.maximize())

  if (isDev) {
    operatorWindow.loadURL(NEXT_URL)
  } else {
    operatorWindow.loadFile(join(DIST_PATH, 'index.html'))
  }

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
  let win = outputWindows.get(n)

  if (!win || win.isDestroyed()) {
    win = new BrowserWindow({
      backgroundColor: '#000000',
      frame: false,
      webPreferences: webPreferences(),
      title: `EasyPresenter Output ${n}`,
      show: false,
      skipTaskbar: true,
    })
    if (isDev) win.loadURL(`${NEXT_URL}/output/?display=${n}`)
    else win.loadFile(join(DIST_PATH, 'output/index.html'), { query: { display: String(n) } })
    const created = win
    win.once('ready-to-show', () => created.show())
    win.on('closed', () => { if (outputWindows.get(n) === created) outputWindows.delete(n) })
    outputWindows.set(n, win)
  }

  win.setFullScreen(false)
  if (display) {
    win.setBounds(display.bounds)
    win.setFullScreen(true)
  } else {
    // Single-screen laptop: small preview window on the operator screen
    const p = screen.getPrimaryDisplay().workArea
    win.setBounds({ x: p.x + p.width - 500 * n, y: p.y + p.height - 300, width: 480, height: 270 })
  }
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

// Relay studio commands (lower thirds) from operator → every output window
ipcMain.on('slide:command', (_event, data) => {
  outputWindows.forEach(w => w.webContents.send('slide:command', data))
})

ipcMain.handle('app:get-displays', () => listDisplays())

ipcMain.handle('settings:apply-native', (_event, s: NativeSettings) => {
  native = { output: { ...DEFAULT_NATIVE.output, ...s.output }, performance: { ...DEFAULT_NATIVE.performance, ...s.performance } }
  try { writeFileSync(SETTINGS_FILE, JSON.stringify(native, null, 2)) } catch { /* read-only profile */ }
  applyOutputs(native)
})

ipcMain.handle('app:gpu-info', () => app.getGPUFeatureStatus() as unknown as Record<string, string>)

ipcMain.on('app:relaunch', () => {
  app.relaunch()
  app.exit(0)
})

app.whenReady().then(() => {
  createOperatorWindow()
  applyOutputs(native)

  // Monitor plugged / unplugged → re-place output windows
  const replace = () => { connectorCache = null; applyOutputs(native) }
  screen.on('display-added', replace)
  screen.on('display-removed', replace)

  app.on('activate', () => {
    if (!operatorWindow) createOperatorWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
