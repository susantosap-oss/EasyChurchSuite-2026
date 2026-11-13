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

/** Overwrite an existing scene: { name, service_date, items } */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getPresenterDb() as unknown as import('better-sqlite3').Database
    const id = parseInt(params.id, 10)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const { name, service_date, items } = await req.json() as {
      name: string
      service_date?: string | null
      items: Array<{ type: string }>
    }
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const exists = db.prepare('SELECT id FROM playlists WHERE id = ?').get(id)
    if (!exists) return NextResponse.json({ error: 'Scene not found' }, { status: 404 })

    const insertItem = db.prepare(
      'INSERT INTO playlist_items(playlist_id, item_order, item_type, metadata) VALUES (?, ?, ?, ?)'
    )
    db.transaction(() => {
      db.prepare(
        `UPDATE playlists SET name = ?, service_date = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`
      ).run(name.trim(), service_date ?? null, id)
      db.prepare('DELETE FROM playlist_items WHERE playlist_id = ?').run(id)
      items.forEach((item, i) => insertItem.run(id, i + 1, item.type, JSON.stringify(item)))
    })()

    return NextResponse.json({ id, success: true })
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
