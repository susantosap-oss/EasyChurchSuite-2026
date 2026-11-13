import { NextRequest, NextResponse } from 'next/server'
import { getPresenterDb } from '@/lib/db.server'

/** Save presenter defaults for a song: { settings: SongSettings } */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getPresenterDb() as unknown as import('better-sqlite3').Database
    const id = parseInt(params.id, 10)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const { settings } = await req.json() as { settings: unknown }
    const result = db.prepare(
      `UPDATE songs SET settings = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`
    ).run(settings == null ? null : JSON.stringify(settings), id)
    if (result.changes === 0) return NextResponse.json({ error: 'Song not found' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}

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
