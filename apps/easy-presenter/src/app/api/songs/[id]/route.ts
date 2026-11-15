import { NextRequest, NextResponse } from 'next/server'
import { getPresenterDb } from '@/lib/db.server'
import { invalidateSpellDict } from '@/lib/spell/spell.server'
import { replaceWord } from '@/lib/spell/text'

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
    invalidateSpellDict()
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}

/**
 * Spelling fixes: { fixes: [{ from, to }] } — every whole-word occurrence of `from`
 * in the title and all slides is replaced (case-insensitive, keeping each occurrence's casing).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getPresenterDb() as unknown as import('better-sqlite3').Database
    const id = parseInt(params.id, 10)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const { fixes } = await req.json() as { fixes?: Array<{ from: string; to: string }> }
    const list = (fixes ?? []).filter(f => f.from?.trim() && f.to?.trim() && f.from !== f.to)
    if (!list.length) return NextResponse.json({ error: 'No fixes' }, { status: 400 })

    const song = db.prepare('SELECT title FROM songs WHERE id = ?').get(id) as { title: string } | undefined
    if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    const slides = db.prepare('SELECT id, lyrics FROM song_slides WHERE song_id = ?').all(id) as { id: number; lyrics: string }[]

    const fix = (text: string) => {
      let out = text, n = 0
      for (const f of list) { const r = replaceWord(out, f.from.trim(), f.to.trim()); out = r.text; n += r.count }
      return { text: out, n }
    }

    let replaced = 0
    db.transaction(() => {
      const t = fix(song.title)
      if (t.n) {
        db.prepare(`UPDATE songs SET title = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`).run(t.text, id)
        replaced += t.n
      }
      const upd = db.prepare('UPDATE song_slides SET lyrics = ? WHERE id = ?')
      for (const sl of slides) {
        const r = fix(sl.lyrics)
        if (r.n) { upd.run(r.text, sl.id); replaced += r.n }
      }
    })()
    invalidateSpellDict()

    const updated = {
      title: (db.prepare('SELECT title FROM songs WHERE id = ?').get(id) as { title: string }).title,
      slides: db.prepare('SELECT id, slide_order, label, lyrics FROM song_slides WHERE song_id = ? ORDER BY slide_order').all(id),
    }
    return NextResponse.json({ success: true, replaced, song: updated })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
