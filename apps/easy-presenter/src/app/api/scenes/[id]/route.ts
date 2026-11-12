import { NextRequest, NextResponse } from 'next/server'
import { getPresenterDb } from '@/lib/db.server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getPresenterDb() as unknown as import('better-sqlite3').Database
    const id = parseInt(params.id, 10)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id)
    if (!playlist) return NextResponse.json({ error: 'Scene not found' }, { status: 404 })

    const rows = db.prepare(
      'SELECT metadata FROM playlist_items WHERE playlist_id = ? ORDER BY item_order'
    ).all(id) as { metadata: string }[]

    const items = rows.map(r => JSON.parse(r.metadata))
    return NextResponse.json({ playlist, items })
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
    db.prepare('DELETE FROM playlists WHERE id = ?').run(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
