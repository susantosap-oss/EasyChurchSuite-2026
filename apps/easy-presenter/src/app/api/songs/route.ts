import { NextRequest, NextResponse } from 'next/server'
import { getPresenterDb } from '@/lib/db.server'

export async function GET() {
  try {
    const db = getPresenterDb() as unknown as import('better-sqlite3').Database
    const songs = db.prepare(`
      SELECT id, title, artist, settings FROM songs ORDER BY title COLLATE NOCASE
    `).all() as { id: number; title: string; artist: string; settings: string | null }[]

    const result = songs.map(song => {
      const slides = (db.prepare(`
        SELECT id, slide_order, label, lyrics FROM song_slides
        WHERE song_id = ? ORDER BY slide_order
      `).all(song.id)) as { id: number; slide_order: number; label: string; lyrics: string }[]
      return { ...song, settings: song.settings ? JSON.parse(song.settings) : null, slides }
    })

    return NextResponse.json({ songs: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getPresenterDb() as unknown as import('better-sqlite3').Database
    const body = await req.json() as {
      title: string
      artist?: string
      slides: Array<{ label: string; lyrics: string }>
    }

    const { title, artist, slides } = body
    if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
    if (!slides?.length) return NextResponse.json({ error: 'Slides required' }, { status: 400 })

    const result = db.prepare(
      'INSERT INTO songs(title, artist) VALUES (?, ?)'
    ).run(title.trim(), (artist ?? '').trim())

    const songId = result.lastInsertRowid as number

    const insertSlide = db.prepare(
      'INSERT INTO song_slides(song_id, slide_order, label, lyrics) VALUES (?, ?, ?, ?)'
    )

    const insertAll = db.transaction(() => {
      slides.forEach((slide, i) => {
        insertSlide.run(songId, i + 1, slide.label || `Slide ${i + 1}`, slide.lyrics)
      })
    })
    insertAll()

    return NextResponse.json({ id: songId, success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
