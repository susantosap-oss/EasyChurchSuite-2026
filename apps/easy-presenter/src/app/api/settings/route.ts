import { NextRequest, NextResponse } from 'next/server'
import { getPresenterDb } from '@/lib/db.server'

const KEY = 'presenter.settings'

/** App settings (Settings ⚙) — one JSON document in app_settings */
export async function GET() {
  try {
    const db  = getPresenterDb() as unknown as import('better-sqlite3').Database
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(KEY) as { value: string } | undefined
    return NextResponse.json({ settings: row ? JSON.parse(row.value) : null })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getPresenterDb() as unknown as import('better-sqlite3').Database
    const { settings } = await req.json() as { settings: unknown }
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'settings object required' }, { status: 400 })
    }
    db.prepare(`
      INSERT INTO app_settings(key, value, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(KEY, JSON.stringify(settings))
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
