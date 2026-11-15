// Renders the app icons from the artwork in build/ (rounded-square tiles cropped from the
// designer's JPGs; the white corners become transparent):
//   build/icon-launcher.jpg (no text)  → build/icon.ico (16–256: exe, shortcut, taskbar, installer)
//                                        build/icon.png (512: phone remote home-screen icon)
//                                        src/app/icon.png (256: browser tab / TopBar logo)
//   build/icon-app.jpg (with name)     → build/logo-app.png (512: startup splash)
// Runs inside Electron so no image tooling is needed:
//   npx electron scripts/make-icon.cjs
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const root     = path.resolve(__dirname, '..')
const buildDir = path.join(root, 'build')
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
const RADIUS = 0.17   // corner radius of the tile, share of its width

function svgFor(jpg) {
  const data = fs.readFileSync(path.join(buildDir, jpg)).toString('base64')
  // Clip slightly inside the tile so no white fringe from the JPG corners survives
  const inset = 6, size = 1024 - inset * 2, r = Math.round(size * RADIUS)
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${inset} ${inset} ${size} ${size}">
    <defs><clipPath id="c"><rect x="${inset}" y="${inset}" width="${size}" height="${size}" rx="${r}" ry="${r}"/></clipPath></defs>
    <image clip-path="url(#c)" x="0" y="0" width="1024" height="1024" xlink:href="data:image/jpeg;base64,${data}"/>
  </svg>`
}

app.disableHardwareAcceleration()

async function render(win, svg, size) {
  const html = `<html><body style="margin:0;background:transparent">
    <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${size}" height="${size}"></body></html>`
  win.setContentSize(size, size)
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  await new Promise(r => setTimeout(r, 50))
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
  const launcher = svgFor('icon-launcher.jpg')
  const pngs = []
  for (const size of ICO_SIZES) pngs.push({ size, png: await render(win, launcher, size) })
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), toIco(pngs))
  fs.writeFileSync(path.join(buildDir, 'icon.png'), await render(win, launcher, 512))
  fs.writeFileSync(path.join(root, 'src/app/icon.png'), await render(win, launcher, 256))
  fs.writeFileSync(path.join(buildDir, 'logo-app.png'), await render(win, svgFor('icon-app.jpg'), 512))
  console.log('icon.ico, icon.png, src/app/icon.png (launcher) + logo-app.png (splash)')
  app.quit()
})
