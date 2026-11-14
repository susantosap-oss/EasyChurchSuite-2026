// Renders build/icon.svg into build/icon.png (512) and build/icon.ico (16–256, PNG entries).
// Runs inside Electron so no image tooling is needed:
//   npx electron scripts/make-icon.cjs
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const buildDir = path.resolve(__dirname, '../build')
const svg = fs.readFileSync(path.join(buildDir, 'icon.svg'), 'utf8')
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

app.disableHardwareAcceleration()

async function render(win, size) {
  const html = `<html><body style="margin:0;background:transparent">
    <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${size}" height="${size}"></body></html>`
  win.setContentSize(size, size)
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size })
  return img.resize({ width: size, height: size, quality: 'best' }).toPNG()
}

/** ICO container with PNG-compressed entries (supported since Windows Vista) */
function toIco(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  let offset = 6 + 16 * pngs.length
  const dir = pngs.map(({ size, png }) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0)
    e.writeUInt8(size >= 256 ? 0 : size, 1)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += png.length
    return e
  })
  return Buffer.concat([header, ...dir, ...pngs.map(p => p.png)])
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false, frame: false, transparent: true, useContentSize: true,
    webPreferences: { offscreen: true },
  })
  const pngs = []
  for (const size of ICO_SIZES) pngs.push({ size, png: await render(win, size) })
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), toIco(pngs))
  fs.writeFileSync(path.join(buildDir, 'icon.png'), await render(win, 512))
  console.log(`icon.ico (${ICO_SIZES.join(', ')}) + icon.png (512) → ${buildDir}`)
  app.quit()
})
