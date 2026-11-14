import { NextRequest, NextResponse } from 'next/server'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getDataDir } from '@/lib/db.server'
import { mediaDir } from '../shared'
import type { SpeakerDeck } from '@/lib/speakerDecks'

// Reads live data — never prerender at build time
export const dynamic = 'force-dynamic'

/** Media files the operator marked [v] for the Speaker remote (PDF pages are rendered once, when marked) */
const store = () => join(getDataDir(), 'speaker-media.json')

function load(): SpeakerDeck[] {
  try {
    const raw = JSON.parse(readFileSync(store(), 'utf8')) as SpeakerDeck[]
    return Array.isArray(raw) ? raw : []
  } catch { return [] }
}

const save = (decks: SpeakerDeck[]) => writeFileSync(store(), JSON.stringify(decks, null, 2))

const SAFE_FILE  = /^[^/\\]{1,200}$/
const SAFE_URL   = /^\/api\/(media|slides)\/file\/[^?#]+$/

export async function GET() {
  // Files deleted from the library drop out of the list
  const decks = load().filter(d => existsSync(join(mediaDir(), d.file)))
  return NextResponse.json({ decks })
}

/** Mark a file: { file, name, kind, url, pages } */
export async function POST(req: NextRequest) {
  try {
    const d = await req.json() as Partial<SpeakerDeck>
    const pages = Array.isArray(d.pages) ? d.pages.filter(p => typeof p === 'string') : []
    if (!d.file || !SAFE_FILE.test(d.file) || !existsSync(join(mediaDir(), d.file))) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }
    if (!d.url || !SAFE_URL.test(d.url) || !pages.every(p => SAFE_URL.test(p))) {
      return NextResponse.json({ error: 'URL halaman tidak valid' }, { status: 400 })
    }
    if (d.kind !== 'pdf' && d.kind !== 'image' && d.kind !== 'video') {
      return NextResponse.json({ error: 'Jenis file tidak didukung' }, { status: 400 })
    }
    const deck: SpeakerDeck = { file: d.file, name: String(d.name ?? d.file).slice(0, 200), kind: d.kind, url: d.url, pages }
    save([...load().filter(x => x.file !== deck.file), deck])
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 503 })
  }
}

/** Unmark: ?file=<stored name> */
export async function DELETE(req: NextRequest) {
  const file = req.nextUrl.searchParams.get('file') ?? ''
  save(load().filter(d => d.file !== file))
  return NextResponse.json({ success: true })
}
