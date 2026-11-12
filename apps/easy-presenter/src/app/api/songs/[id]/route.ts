import { NextRequest, NextResponse } from 'next/server'
import { getPresenterDb } from '@/lib/db.server'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getPresenterDb() as unknown as import('better-sqlite3').Database
    const id = parseInt(params.id, 10)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const song = db.prepare('SELECT id FROM songs WHERE id = ?').get(id)
    if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 })

    // song_slides will cascade-delete via FK
    db.prepare('DELETE FROM songs WHERE id = ?').run(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
