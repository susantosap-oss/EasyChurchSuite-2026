import { app, BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import squirrelStartup from 'electron-squirrel-startup'
import { ViscaCameraController } from '@easychurch/ptz'

if (squirrelStartup) app.quit()

app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')

let commandCenterWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let stageWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development'
const NEXT_URL = 'http://localhost:3003'
const DIST_PATH = join(__dirname, '../out')

const cameras = new Map<string, ViscaCameraController>()

function getUrl(path = ''): string {
  return isDev ? `${NEXT_URL}${path}` : join(DIST_PATH, path.replace('/', '') + 'index.html')
}

// suppress unused warning
void getUrl

function createCommandCenter() {
  commandCenterWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0a0f1e',
    titleBarStyle: 'hiddenInset',
    frame: process.platform !== 'darwin',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
    title: 'EasyStudio',
    show: false,
  })

  commandCenterWindow.once('ready-to-show', () => commandCenterWindow!.show())
  isDev
    ? commandCenterWindow.loadURL(NEXT_URL)
    : commandCenterWindow.loadFile(join(DIST_PATH, 'index.html'))

  commandCenterWindow.on('closed', () => {
    commandCenterWindow = null
    overlayWindow?.close()
    stageWindow?.close()
  })
}

function createOverlayWindow() {
  // Transparent, always-on-top, click-through window for lower thirds
  overlayWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
    show: false,
  })

  overlayWindow.setIgnoreMouseEvents(true)

  if (isDev) {
    overlayWindow.loadURL(`${NEXT_URL}/overlay`)
  } else {
    overlayWindow.loadFile(join(DIST_PATH, 'overlay/index.html'))
  }
}

function createStageWindow() {
  const displays = screen.getAllDisplays()
  const stageDisplay = displays.find(d => d.id !== screen.getPrimaryDisplay().id) ?? displays[0]!

  stageWindow = new BrowserWindow({
    x: stageDisplay.bounds.x,
    y: stageDisplay.bounds.y,
    width: stageDisplay.bounds.width,
    height: stageDisplay.bounds.height,
    backgroundColor: '#000000',
    frame: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
    show: false,
  })

  if (isDev) {
    stageWindow.loadURL(`${NEXT_URL}/stage`)
  } else {
    stageWindow.loadFile(join(DIST_PATH, 'stage/index.html'))
  }
}

// IPC: Overlay commands
ipcMain.on('overlay:command', (_e, data) => {
  overlayWindow?.webContents.send('overlay:command', data)
})

ipcMain.handle('overlay:show', (_e, show: boolean) => {
  if (show) overlayWindow?.show()
  else overlayWindow?.hide()
})

ipcMain.handle('stage:show', (_e, show: boolean) => {
  if (show) stageWindow?.show()
  else stageWindow?.hide()
})

// IPC: PTZ commands via VISCA
ipcMain.handle('ptz:add-camera', (_e, config) => {
  const ctrl = new ViscaCameraController(config)
  cameras.set(config.id, ctrl)
  return ctrl.connect().then(() => ({ ok: true })).catch(err => ({ ok: false, error: (err as Error).message }))
})

ipcMain.handle('ptz:remove-camera', (_e, id: string) => {
  cameras.get(id)?.disconnect()
  cameras.delete(id)
})

ipcMain.handle('ptz:send', (_e, { cameraId, payload }: { cameraId: string; payload: number[] }) => {
  const ctrl = cameras.get(cameraId)
  if (!ctrl) return { ok: false, error: 'Camera not found' }
  return ctrl.send(payload).then(() => ({ ok: true })).catch(err => ({ ok: false, error: (err as Error).message }))
})

ipcMain.handle('ptz:recall-preset', (_e, { cameraId, presetId }: { cameraId: string; presetId: number }) => {
  const ctrl = cameras.get(cameraId)
  if (!ctrl) return { ok: false, error: 'Camera not found' }
  return ctrl.recallPreset(presetId).then(() => ({ ok: true })).catch(err => ({ ok: false, error: (err as Error).message }))
})

ipcMain.handle('app:get-displays', () => {
  return screen.getAllDisplays().map(d => ({
    id: d.id,
    label: d.label || `Display ${d.id}`,
    bounds: d.bounds,
    isPrimary: d.id === screen.getPrimaryDisplay().id,
  }))
})

// Stage display relay
ipcMain.on('stage:update', (_e, data) => {
  stageWindow?.webContents.send('stage:update', data)
})

app.whenReady().then(() => {
  createCommandCenter()
  createOverlayWindow()
  createStageWindow()
  app.on('activate', () => { if (!commandCenterWindow) createCommandCenter() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
