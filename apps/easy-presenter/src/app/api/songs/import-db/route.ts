import { NextRequest, NextResponse } from 'next/server'
import { getPresenterDb } from '@/lib/db.server'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'

type SongData = {
  title: string
  artist: string
  slides: Array<{ label: string; lyrics: string }>
}

// EasyWorship part type enum (TypeID → human label)
const EW_TYPE_MAP: Record<string, string> = {
  '1': 'Verse', '2': 'Chorus', '3': 'Bridge', '4': 'Tag',
  '5': 'Vamp',  '6': 'Intro',  '7': 'Ending', '8': 'Pre-Chorus',
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

  try {
    const songs = file.name.toLowerCase().endsWith('.json')
      ? await parseJson(file)
      : await parseSqliteDb(file)

    if (songs.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada lagu yang ditemukan dalam file ini. Pastikan format file benar.' },
        { status: 422 }
      )
    }

    const { imported, skipped } = insertSongs(songs)
    return NextResponse.json({ success: true, imported, skipped, total: songs.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── JSON format ───────────────────────────────────────────────────────────────

async function parseJson(file: File): Promise<SongData[]> {
  const text = await file.text()
  const data = JSON.parse(text) as { songs?: SongData[] }
  if (!Array.isArray(data.songs)) throw new Error('Format JSON tidak valid. Harus ada array "songs".')
  return data.songs.filter(s => s.title?.trim())
}

// ── SQLite auto-detect ────────────────────────────────────────────────────────

async function parseSqliteDb(file: File): Promise<SongData[]> {
  const buffer  = Buffer.from(await file.arrayBuffer())
  const tmpPath = join(tmpdir(), `ep_import_${randomUUID()}.db`)
  try {
    writeFileSync(tmpPath, buffer)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BetterSqlite = require('better-sqlite3') as typeof import('better-sqlite3')
    const db = new BetterSqlite(tmpPath, { readonly: true })
    const songs = extractSongs(db)
    db.close()
    return songs
  } finally {
    if (existsSync(tmpPath)) unlinkSync(tmpPath)
  }
}

// ── Schema detection + extraction ─────────────────────────────────────────────

function getTables(db: import('better-sqlite3').Database): string[] {
  return (db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).all() as { name: string }[]).map(t => t.name)
}

function getTableCols(db: import('better-sqlite3').Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[]).map(c => c.name)
}

function pickCol(cols: string[], candidates: string[]): string | null {
  const lower = cols.map(c => c.toLowerCase())
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase())
    if (idx >= 0) return cols[idx]!
  }
  return null
}

function stripXml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .trim()
}

function splitIntoSlides(lyrics: string): SongData['slides'] {
  const parts = lyrics.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  if (parts.length <= 1) return [{ label: 'Slide 1', lyrics: lyrics.trim() }]
  return parts.map((p, i) => ({ label: `Slide ${i + 1}`, lyrics: p }))
}

function extractSongs(db: import('better-sqlite3').Database): SongData[] {
  const tables = getTables(db)
  const tl = (s: string) => s.toLowerCase()

  // 1. EasyWorship 6/7: Song + SongPart (or SongSlide)
  const songT = tables.find(t => tl(t) === 'song')
  const partT = tables.find(t => ['songpart', 'songslide', 'songphrasemap'].includes(tl(t)))
  if (songT && partT) {
    const typeEnumT = tables.find(t => tl(t) === 'songparttypeenum')
    const result = extractTwoTable(db, songT, partT, 'songid', typeEnumT)
    if (result.length > 0) return result
  }

  // 2. OpenLP: songs table with XML lyrics
  const songsT = tables.find(t => tl(t) === 'songs')
  if (songsT) {
    const result = extractOpenLP(db, songsT)
    if (result.length > 0) return result
  }

  // 3. ProPresenter 6 Core Data: ZSONG + ZSONGSLIDE
  const zSongT  = tables.find(t => t.toUpperCase() === 'ZSONG')
  const zSlideT = tables.find(t => t.toUpperCase() === 'ZSONGSLIDE')
  if (zSongT) {
    const result = zSlideT
      ? extractTwoTable(db, zSongT, zSlideT, 'zsong', undefined)
      : extractSingleTable(db, zSongT)
    if (result.length > 0) return result
  }

  // 4. Generic: any table with title + lyrics columns
  for (const table of tables) {
    const cols = getTableCols(db, table)
    const hasTitle  = pickCol(cols, ['title', 'name', 'ztitle', 'song_title']) !== null
    const hasLyrics = pickCol(cols, ['lyrics', 'text', 'content', 'words', 'zlyrics', 'body', 'ztext']) !== null
    if (hasTitle && hasLyrics) {
      const result = extractSingleTable(db, table)
      if (result.length > 0) return result
    }
  }

  return []
}

function extractTwoTable(
  db: import('better-sqlite3').Database,
  songTable: string,
  partTable: string,
  fkHint: string,
  typeEnumTable: string | undefined,
): SongData[] {
  try {
    const songCols = getTableCols(db, songTable)
    const partCols = getTableCols(db, partTable)

    const idCol     = pickCol(songCols, ['songid', 'id', 'z_pk', 'rowid'])
    const titleCol  = pickCol(songCols, ['title', 'name', 'ztitle', 'song_title'])
    const artistCol = pickCol(songCols, ['author', 'artist', 'composer', 'zauthor'])

    const fkCol     = pickCol(partCols, [fkHint, 'song_id', 'songid', 'parent_id', 'zsong'])
    const lyricsCol = pickCol(partCols, ['lyrics', 'text', 'content', 'words', 'zlyrics', 'ztext', 'body'])
    const labelCol  = pickCol(partCols, ['typeid', 'type', 'label', 'name', 'parttype', 'zlabel', 'ztype'])
    const orderCol  = pickCol(partCols, ['partorder', 'slideorder', 'order', 'z_opt', 'sort_order', 'sequence'])

    if (!idCol || !titleCol || !fkCol || !lyricsCol) return []

    // Build type enum map (EasyWorship SongPartTypeEnum or fallback)
    const typeMap: Record<string, string> = { ...EW_TYPE_MAP }
    if (typeEnumTable) {
      try {
        const rows = db.prepare(`SELECT TypeID, Type FROM "${typeEnumTable}"`).all() as { TypeID: number; Type: string }[]
        rows.forEach(r => { typeMap[String(r.TypeID)] = r.Type })
      } catch { /* use defaults */ }
    }

    const selectArtist = artistCol ? `, "${artistCol}" as artist` : ''
    const songRows = db.prepare(
      `SELECT "${idCol}" as id, "${titleCol}" as title${selectArtist} FROM "${songTable}"`
    ).all() as { id: number | string; title: string; artist?: string }[]

    const orderClause  = orderCol  ? `ORDER BY "${orderCol}"` : ''
    const labelExpr    = labelCol  ? `"${labelCol}" as label, ` : `'' as label, `

    return songRows.map(song => {
      const parts = db.prepare(
        `SELECT ${labelExpr}"${lyricsCol}" as lyrics FROM "${partTable}" WHERE "${fkCol}" = ? ${orderClause}`
      ).all(song.id) as { label: string; lyrics: string }[]

      const typeCounts: Record<string, number> = {}
      return {
        title:  song.title?.trim() || '',
        artist: (song.artist ?? '').trim(),
        slides: parts.filter(p => p.lyrics?.trim()).map(p => {
          const rawLabel = String(p.label ?? '').trim()
          const typeName = typeMap[rawLabel] || rawLabel || 'Slide'
          typeCounts[typeName] = (typeCounts[typeName] ?? 0) + 1
          const label = typeCounts[typeName]! > 1 ? `${typeName} ${typeCounts[typeName]}` : typeName
          return { label, lyrics: stripXml(p.lyrics) }
        }),
      }
    }).filter(s => s.title && s.slides.length > 0)
  } catch {
    return []
  }
}

function extractOpenLP(db: import('better-sqlite3').Database, table: string): SongData[] {
  try {
    const cols     = getTableCols(db, table)
    const titleCol  = pickCol(cols, ['title', 'name'])
    const lyricsCol = pickCol(cols, ['lyrics', 'text', 'content'])
    const artistCol = pickCol(cols, ['author', 'copyright'])

    if (!titleCol || !lyricsCol) return []

    const selectArtist = artistCol ? `, "${artistCol}" as artist` : ''
    const rows = db.prepare(
      `SELECT "${titleCol}" as title, "${lyricsCol}" as lyrics${selectArtist} FROM "${table}"`
    ).all() as { title: string; lyrics: string; artist?: string }[]

    return rows.map(row => {
      const slides: SongData['slides'] = []
      // OpenLP lyrics are XML — extract <verse> blocks
      const verseRe = /<verse\b[^>]*>([\s\S]*?)<\/verse>/gi
      const typeRe  = /type="([^"]*)"/i
      const labelRe = /label="([^"]*)"/i
      let match
      while ((match = verseRe.exec(row.lyrics)) !== null) {
        const attrs   = match[0]!
        const type    = (typeRe.exec(attrs)?.[1] ?? '').replace(/^./, c => c.toUpperCase())
        const label   = labelRe.exec(attrs)?.[1] ?? ''
        const text    = stripXml(match[1] ?? '')
        if (text) slides.push({ label: `${type} ${label}`.trim() || `Slide ${slides.length + 1}`, lyrics: text })
      }
      if (slides.length === 0) {
        const text = stripXml(row.lyrics)
        if (text) slides.push(...splitIntoSlides(text))
      }
      return { title: row.title?.trim() || '', artist: (row.artist ?? '').trim(), slides }
    }).filter(s => s.title && s.slides.length > 0)
  } catch {
    return []
  }
}

function extractSingleTable(db: import('better-sqlite3').Database, table: string): SongData[] {
  try {
    const cols     = getTableCols(db, table)
    const titleCol  = pickCol(cols, ['title', 'name', 'ztitle', 'song_title'])
    const lyricsCol = pickCol(cols, ['lyrics', 'text', 'content', 'words', 'zlyrics', 'body', 'ztext'])
    const artistCol = pickCol(cols, ['author', 'artist', 'composer', 'zauthor'])

    if (!titleCol || !lyricsCol) return []

    const selectArtist = artistCol ? `, "${artistCol}" as artist` : ''
    const rows = db.prepare(
      `SELECT "${titleCol}" as title, "${lyricsCol}" as lyrics${selectArtist} FROM "${table}"`
    ).all() as { title: string; lyrics: string; artist?: string }[]

    return rows.map(row => {
      const text = stripXml(row.lyrics ?? '')
      if (!text || !row.title?.trim()) return null
      return { title: row.title.trim(), artist: (row.artist ?? '').trim(), slides: splitIntoSlides(text) }
    }).filter((s): s is SongData => s !== null)
  } catch {
    return []
  }
}

// ── Insert into presenter DB ──────────────────────────────────────────────────

function insertSongs(songs: SongData[]) {
  const db = getPresenterDb() as unknown as import('better-sqlite3').Database

  const existing = new Set(
    (db.prepare('SELECT LOWER(title) as t FROM songs').all() as { t: string }[]).map(r => r.t)
  )

  const insertSong  = db.prepare('INSERT INTO songs(title, artist) VALUES (?, ?)')
  const insertSlide = db.prepare('INSERT INTO song_slides(song_id, slide_order, label, lyrics) VALUES (?, ?, ?, ?)')

  let imported = 0
  let skipped  = 0

  const run = db.transaction(() => {
    for (const song of songs) {
      if (!song.title.trim() || existing.has(song.title.toLowerCase())) { skipped++; continue }
      const { lastInsertRowid } = insertSong.run(song.title.trim(), song.artist.trim())
      song.slides.forEach((s, i) => {
        insertSlide.run(lastInsertRowid, i + 1, s.label || `Slide ${i + 1}`, s.lyrics || '')
      })
      imported++
    }
  })
  run()

  return { imported, skipped }
}
