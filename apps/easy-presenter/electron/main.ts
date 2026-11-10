import { app, BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import squirrelStartup from 'electron-squirrel-startup'

if (squirrelStartup) app.quit()

// Performance: disable hardware acceleration only for very old GPUs
// app.disableHardwareAcceleration()
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')

let operatorWindow: BrowserWindow | null = null
let outputWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development'
const NEXT_URL = 'http://localhost:3001'
const DIST_PATH = join(__dirname, '../out')

function createOperatorWindow() {
  operatorWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset',
    frame: process.platform !== 'darwin',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
    title: 'EasyPresenter',
    show: false,
  })

  operatorWindow.once('ready-to-show', () => operatorWindow!.show())

  if (isDev) {
    operatorWindow.loadURL(NEXT_URL)
    operatorWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    operatorWindow.loadFile(join(DIST_PATH, 'index.html'))
  }

  operatorWindow.on('closed', () => {
    operatorWindow = null
    outputWindow?.close()
  })
}

function createOutputWindow() {
  const displays = screen.getAllDisplays()
  const outputDisplay = displays.find(d => d.id !== screen.getPrimaryDisplay().id) ?? displays[0]!

  outputWindow = new BrowserWindow({
    x: outputDisplay.bounds.x,
    y: outputDisplay.bounds.y,
    width: outputDisplay.bounds.width,
    height: outputDisplay.bounds.height,
    backgroundColor: '#000000',
    frame: false,
    fullscreen: displays.length > 1,
    kiosk: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
    title: 'EasyPresenter Output',
    show: false,
    skipTaskbar: true,
  })

  if (isDev) {
    outputWindow.loadURL(`${NEXT_URL}/output`)
  } else {
    outputWindow.loadFile(join(DIST_PATH, 'output/index.html'))
  }

  outputWindow.once('ready-to-show', () => outputWindow!.show())
}

// IPC: relay slide commands from operator → output window
ipcMain.on('slide:command', (_event, data) => {
  outputWindow?.webContents.send('slide:command', data)
})

ipcMain.handle('app:get-displays', () => {
  return screen.getAllDisplays().map(d => ({
    id: d.id,
    label: d.label || `Display ${d.id}`,
    bounds: d.bounds,
    isPrimary: d.id === screen.getPrimaryDisplay().id,
  }))
})

app.whenReady().then(() => {
  createOperatorWindow()
  createOutputWindow()

  app.on('activate', () => {
    if (!operatorWindow) createOperatorWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
