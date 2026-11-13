import { NextRequest, NextResponse } from 'next/server'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, extname } from 'path'
import { slidesDir } from './shared'

const SAFE = /^[\w-]{1,80}$/

/** Upload one page image: multipart fields "deck", "name", "file" */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const deck = String(form.get('deck') ?? '')
    const name = String(form.get('name') ?? '')
    const file = form.get('file')
    const ext  = extname(name).toLowerCase()
    if (!SAFE.test(deck) || !SAFE.test(name.slice(0, -ext.length)) || !['.jpg', '.png'].includes(ext)) {
      return NextResponse.json({ error: 'Invalid deck or file name' }, { status: 400 })
    }
    if (!(file instanceof File)) return NextResponse.json({ error: 'File required' }, { status: 400 })

    const dir = join(slidesDir(), deck)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, name), Buffer.from(await file.arrayBuffer()))

    return NextResponse.json({ url: `/api/slides/file/${deck}/${name}` })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
