import { NextRequest, NextResponse } from 'next/server'
import { getPresenterDb } from '@/lib/db.server'

export async function GET() {
  try {
    const db = getPresenterDb() as unknown as import('better-sqlite3').Database
    const scenes = db.prepare(`
      SELECT id, name, service_date, created_at FROM playlists ORDER BY created_at DESC
    `).all()
    return NextResponse.json({ scenes })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getPresenterDb() as unknown as import('better-sqlite3').Database
    const body = await req.json() as {
      name: string
      service_date?: string
      items: unknown[]
    }

    const { name, service_date, items } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const result = db.prepare(
      'INSERT INTO playlists(name, service_date) VALUES (?, ?)'
    ).run(name.trim(), service_date ?? null)

    const playlistId = result.lastInsertRowid as number

    const insertItem = db.prepare(
      'INSERT INTO playlist_items(playlist_id, item_order, item_type, metadata) VALUES (?, ?, ?, ?)'
    )

    const insertAll = db.transaction(() => {
      ;(items as Array<{ type: string }>).forEach((item, i) => {
        insertItem.run(playlistId, i + 1, item.type, JSON.stringify(item))
      })
    })
    insertAll()

    return NextResponse.json({ id: playlistId, success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
