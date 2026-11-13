import { NextRequest, NextResponse } from 'next/server'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join, extname, basename } from 'path'
import { backgroundsDir, bgKind, bgFileUrl } from './shared'

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
    if (!bgKind(`x${ext}`)) return NextResponse.json({ error: `Format ${ext || '?'} tidak didukung` }, { status: 400 })

    const dir = backgroundsDir()
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    // Timestamp prefix keeps names unique; strip anything path-like from the original name
    const safe = basename(file.name).replace(/[^\w.\- ]+/g, '_')
    const stored = `${Date.now()}_${safe}`
    writeFileSync(join(dir, stored), Buffer.from(await file.arrayBuffer()))

    return NextResponse.json({ name: safe, file: stored, kind: bgKind(stored), url: bgFileUrl(stored) })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
