// Builds the installer's bundled background library (vendor/backgrounds) from a source folder:
//   <src>/Animated/*  → ECsuite001.mp4, ECsuite002.mp4 …  (GIFs keep .gif: ECsuite0NN.gif)
//   <src>/Image/*     → ECsuite01.jpg, ECsuite02.png …
// Videos are made light for looping on low-end PCs (same limits as uploaded backgrounds):
// H.264, max 1080p / 30 fps / 8 Mbps, no audio, faststart. Portrait clips are centre-cropped to 16:9.
// Images are scaled to fit 1920×1080 (never enlarged).
//   node scripts/make-backgrounds.cjs D:/Background
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const root   = path.resolve(__dirname, '..')
const src    = path.resolve(process.argv[2] || 'D:/Background')
const out    = path.join(root, 'vendor/backgrounds')
const ffmpeg = path.join(root, 'vendor/ffmpeg/ffmpeg.exe')

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi|wmv|mpe?g|flv|3gp|ts|mts|m2ts)$/i
const GIF_EXT   = /\.gif$/i
const IMAGE_EXT = /\.(jpe?g|png|webp|bmp)$/i

if (!fs.existsSync(ffmpeg)) { console.error(`missing ${ffmpeg}`); process.exit(1) }
fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })

function ff(args) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(r.stderr || `ffmpeg exit ${r.status}`)
}

function probe(file) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-i', file], { encoding: 'utf8' })
  const line = r.stderr.split('\n').find(l => /Stream #.*Video:/.test(l)) || ''
  const m = line.match(/, (\d{2,5})x(\d{2,5})[,\s]/)
  const fps = parseFloat((line.match(/([\d.]+) fps/) || [])[1] || '30')
  return { w: m ? +m[1] : 0, h: m ? +m[2] : 0, fps }
}

const list = dir => fs.existsSync(dir)
  ? fs.readdirSync(dir).filter(n => fs.statSync(path.join(dir, n)).isFile()).sort((a, b) => a.localeCompare(b))
  : []

const kb = f => `${(fs.statSync(f).size / 1048576).toFixed(1)} MB`
const manifest = []

// ── Animated ──
let n = 0
for (const name of list(path.join(src, 'Animated'))) {
  const input = path.join(src, 'Animated', name)
  if (!VIDEO_EXT.test(name) && !GIF_EXT.test(name)) { console.log(`  skip ${name}`); continue }
  n++
  const id = `ECsuite${String(n).padStart(3, '0')}`
  if (GIF_EXT.test(name)) {
    const target = path.join(out, `${id}.gif`)
    fs.copyFileSync(input, target)
    manifest.push({ file: path.basename(target), source: name })
    console.log(`  ${name} → ${path.basename(target)} (${kb(target)})`)
    continue
  }
  const { w, h, fps } = probe(input)
  const filters = []
  if (h > w) filters.push('crop=iw:trunc(iw*9/16/2)*2')            // portrait → centre 16:9
  filters.push("scale=-2:'min(1080,ih)':flags=lanczos")
  if (fps > 30.5) filters.push('fps=30')
  const target = path.join(out, `${id}.mp4`)
  ff([
    '-i', input, '-map', '0:v:0', '-an',
    '-vf', filters.join(','),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-maxrate', '8000k', '-bufsize', '16000k',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart',
    target,
  ])
  const o = probe(target)
  manifest.push({ file: path.basename(target), source: name })
  console.log(`  ${name} (${w}x${h} ${fps}fps) → ${path.basename(target)} ${o.w}x${o.h} ${o.fps}fps (${kb(target)})`)
}

// ── Images ──
let m = 0
for (const name of list(path.join(src, 'Image'))) {
  const input = path.join(src, 'Image', name)
  if (!IMAGE_EXT.test(name)) { console.log(`  skip ${name}`); continue }
  m++
  const isPng = /\.png$/i.test(name)
  const target = path.join(out, `ECsuite${String(m).padStart(2, '0')}.${isPng ? 'png' : 'jpg'}`)
  ff([
    '-i', input, '-frames:v', '1',
    '-vf', "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease:flags=lanczos",
    ...(isPng ? [] : ['-q:v', '2']),
    target,
  ])
  const o = probe(target)
  manifest.push({ file: path.basename(target), source: name })
  console.log(`  ${name} → ${path.basename(target)} ${o.w}x${o.h} (${kb(target)})`)
}

fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2))
const total = fs.readdirSync(out).reduce((s, f) => s + fs.statSync(path.join(out, f)).size, 0)
console.log(`[backgrounds] ${n} animated + ${m} images → ${out} (${(total / 1048576).toFixed(1)} MB)`)
