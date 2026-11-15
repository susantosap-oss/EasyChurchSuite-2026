import { NextRequest, NextResponse } from 'next/server'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs'
import { join, extname, basename } from 'path'
import { backgroundsDir, bgKind, bgFileUrl } from './shared'
import { getServerSettings } from '@/lib/settings.server'
import {
  resolveFfmpeg, probeVideo, conversionReasons, enqueueConversion, conversionsSettled, CONVERT_ONLY_EXT,
} from '@/lib/ffmpeg.server'
import type { VideoLimits } from '@/components/settings/appSettings'

/**
 * Background videos loop the whole time they are on screen, so they get tighter limits than
 * the Media tab: never above 1080p / 30 fps / 8 Mbps, H.264, no audio (backgrounds are muted).
 * The Performa settings can only make these stricter.
 */
const BG_MAX_HEIGHT = 1080
const BG_MAX_FPS = 30
const BG_MAX_KBPS = 8000

function backgroundLimits(v: VideoLimits): VideoLimits {
  return {
    ...v,
    maxHeight: Math.min(v.maxHeight, BG_MAX_HEIGHT) as VideoLimits['maxHeight'],
    maxFps: Math.min(v.maxFps, BG_MAX_FPS) as VideoLimits['maxFps'],
    maxBitrateKbps: Math.min(v.maxBitrateKbps, BG_MAX_KBPS),
    keepOriginal: false,   // the library lists every file in the folder — keep only the light copy
  }
}

/**
 * Convert a just-uploaded background video when it is too heavy for smooth looping.
 * Waits for the conversion so the client only ever references the final file.
 * Returns the stored name to use and an optional note for the operator.
 */
async function optimizeBackgroundVideo(dir: string, stored: string): Promise<{ stored: string; note: string | null }> {
  const ext = extname(stored).toLowerCase()
  const ff  = await resolveFfmpeg()
  if (!ff) {
    return CONVERT_ONLY_EXT.has(ext)
      ? { stored, note: 'FFmpeg tidak ditemukan — format ini tidak bisa diputar' }
      : { stored, note: null }
  }
  const info = await probeVideo(ff, join(dir, stored))
  if (!info) return { stored, note: null }

  const settings = getServerSettings().performance.video
  const limits   = backgroundLimits(settings)
  const reasons  = conversionReasons(info, limits, ext)
  if (!reasons.length) return { stored, note: null }
  if (!settings.autoConvert && !CONVERT_ONLY_EXT.has(ext)) {
    return { stored, note: `Video berat: ${reasons.join(', ')}` }
  }

  const height = Math.min(info.height || limits.maxHeight, limits.maxHeight)
  const base   = stored.replace(/^\d+_/, '').replace(/\.[^.]+$/, '')
  const target = `${Date.now()}_${base}-${height}p.mp4`
  const job = enqueueConversion(ff, dir, stored, target, info, limits, reasons, { noAudio: true })
  await conversionsSettled()
  if (job.state !== 'done') return { stored, note: `Konversi gagal (${job.error ?? 'error'}) — dipakai file asli` }
  return { stored: target, note: `Dioptimalkan: ${reasons.join(', ')}` }
}

/** List uploaded background files (newest first) */
export async function GET() {
  try {
    const dir = backgroundsDir()
    if (!existsSync(dir)) return NextResponse.json({ files: [] })
    const files = readdirSync(dir)
      .filter(n => bgKind(n))
      .map(n => ({ n, t: statSync(join(dir, n)).mtimeMs }))
      .sort((a, b) => b.t - a.t)
      .map(({ n }) => ({ name: n.replace(/^\d+_/, ''), file: n, kind: bgKind(n), url: bgFileUrl(n) }))
    return NextResponse.json({ files })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}

/** Upload one background file (multipart field "file") */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'File required' }, { status: 400 })

    const ext = extname(file.name).toLowerCase()
    // .mkv / .avi / .wmv … are accepted too: they are always converted to MP4 below
    if (!bgKind(`x${ext}`) && !CONVERT_ONLY_EXT.has(ext)) {
      return NextResponse.json({ error: `Format ${ext || '?'} tidak didukung` }, { status: 400 })
    }

    const dir = backgroundsDir()
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    // Timestamp prefix keeps names unique; strip anything path-like from the original name
    const safe = basename(file.name).replace(/[^\w.\- ]+/g, '_')
    let stored = `${Date.now()}_${safe}`
    writeFileSync(join(dir, stored), Buffer.from(await file.arrayBuffer()))

    let note: string | null = null
    if (CONVERT_ONLY_EXT.has(ext) || bgKind(stored) === 'video') {
      ({ stored, note } = await optimizeBackgroundVideo(dir, stored))
    }
    if (!bgKind(stored)) {
      // Unplayable container that could not be converted — don't keep a file the library can't show
      if (existsSync(join(dir, stored))) unlinkSync(join(dir, stored))
      return NextResponse.json({ error: note ?? `Format ${ext} tidak bisa diputar` }, { status: 422 })
    }

    return NextResponse.json({ name: safe, file: stored, kind: bgKind(stored), url: bgFileUrl(stored), note })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
