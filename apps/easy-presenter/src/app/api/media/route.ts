import { NextRequest, NextResponse } from 'next/server'
import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join, basename, extname } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { mediaDir, mediaKind, mediaFileUrl, displayName, isPlayable } from './shared'
import { resolveFfmpeg, probeVideo, conversionReasons, enqueueConversion, jobFor } from '@/lib/ffmpeg.server'
import { getServerSettings } from '@/lib/settings.server'

const describe = (file: string, size: number) => ({
  file, name: displayName(file), kind: mediaKind(file), size, url: mediaFileUrl(file),
  playable: isPlayable(file), job: jobFor(file) ?? null,
})

/** List media library files (newest first) */
export async function GET() {
  try {
    const dir = mediaDir()
    if (!existsSync(dir)) return NextResponse.json({ files: [] })
    const files = readdirSync(dir)
      .filter(n => mediaKind(n))
      .map(n => ({ n, st: statSync(join(dir, n)) }))
      .sort((a, b) => b.st.mtimeMs - a.st.mtimeMs)
      .map(({ n, st }) => describe(n, st.size))
    return NextResponse.json({ files })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}

/** Upload one file as the raw request body: POST /api/media/?name=<original file name> (streamed to disk) */
export async function POST(req: NextRequest) {
  const original = basename(req.nextUrl.searchParams.get('name') ?? '')
  if (!original || !mediaKind(original)) {
    return NextResponse.json({ error: 'Format file tidak didukung' }, { status: 400 })
  }
  if (!req.body) return NextResponse.json({ error: 'File kosong' }, { status: 400 })

  const dir = mediaDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const stored = `${Date.now()}_${original.replace(/[^\w.\- ]+/g, '_')}`
  const path   = join(dir, stored)

  try {
    await pipeline(Readable.fromWeb(req.body as import('stream/web').ReadableStream), createWriteStream(path))
    const size = statSync(path).size
    let note: string | null = null

    // Videos above the playback limits are converted to H.264 MP4 in the background
    if (mediaKind(stored) === 'video') {
      const limits = getServerSettings().performance.video
      const ff     = await resolveFfmpeg()
      const info   = ff ? await probeVideo(ff, path) : null
      const ext    = extname(stored).toLowerCase()
      if (!ff) {
        if (!isPlayable(stored)) note = 'FFmpeg tidak ditemukan — format ini tidak bisa diputar tanpa konversi'
      } else if (info) {
        const reasons = conversionReasons(info, limits, ext)
        if (reasons.length && (limits.autoConvert || !isPlayable(stored))) {
          const base   = stored.replace(/^\d+_/, '').replace(/\.[^.]+$/, '')
          const height = Math.min(info.height || limits.maxHeight, limits.maxHeight)
          enqueueConversion(ff, dir, stored, `${Date.now()}_${base}-${height}p.mp4`, info, limits, reasons)
        } else if (reasons.length) {
          note = `Video berat: ${reasons.join(', ')}`
        }
      }
    }

    return NextResponse.json({ ...describe(stored, size), note })
  } catch (err) {
    if (existsSync(path)) unlinkSync(path)   // drop partial uploads
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
