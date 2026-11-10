import { NextResponse, type NextRequest } from 'next/server'
import Database from 'better-sqlite3'
import { existsSync } from 'fs'
import { resolve, join } from 'path'
import { upsertHighlight, removeHighlight } from '@easychurch/bible-queries'

export const dynamic = 'force-dynamic'

function getWritableDb() {
  // Writable DB (not readonly) for mutations
  const candidates = [
    process.env.DB_PATH,
    join(process.cwd(), '../../data/easy_bible.db'),
  ].filter(Boolean) as string[]

  for (const p of candidates) {
    if (existsSync(resolve(p))) {
      const db = new Database(resolve(p))
      db.pragma('journal_mode = WAL')
      db.pragma('foreign_keys = ON')
      return db
    }
  }
  throw new Error('Database not found')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { verseId: number; color: string }
    if (!body.verseId || !body.color) {
      return NextResponse.json({ error: 'verseId and color required' }, { status: 400 })
    }
    const db = getWritableDb()
    upsertHighlight(db, body.verseId, body.color)
    db.close()
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json() as { verseId: number }
    if (!body.verseId) {
      return NextResponse.json({ error: 'verseId required' }, { status: 400 })
    }
    const db = getWritableDb()
    removeHighlight(db, body.verseId)
    db.close()
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
