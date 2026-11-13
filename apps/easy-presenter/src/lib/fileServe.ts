import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, existsSync, statSync } from 'fs'
import { extname } from 'path'
import { Readable } from 'stream'

export const MEDIA_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.m4v': 'video/mp4',
}

/** Stream a stored file — supports Range requests so videos can loop/seek */
export function serveFile(req: NextRequest, path: string, mimeMap: Record<string, string> = MEDIA_MIME): NextResponse {
  const mime = mimeMap[extname(path).toLowerCase()]
  if (!mime || !existsSync(path)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const size  = statSync(path).size
  const range = req.headers.get('range')
  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
  }

  const m = range?.match(/bytes=(\d*)-(\d*)/)
  if (m) {
    const start = m[1] ? parseInt(m[1], 10) : 0
    const end   = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1
    if (start >= size || start > end) {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    }
    const stream = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream
    return new NextResponse(stream, {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
    })
  }

  const stream = Readable.toWeb(createReadStream(path)) as ReadableStream
  return new NextResponse(stream, { headers: { ...headers, 'Content-Length': String(size) } })
}
