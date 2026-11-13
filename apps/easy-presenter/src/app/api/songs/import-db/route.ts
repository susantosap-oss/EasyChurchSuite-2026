import { NextRequest, NextResponse } from 'next/server'
import { getPresenterDb } from '@/lib/db.server'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { rtfToText } from '@/lib/rtf'
import { parseLyrics } from '@/lib/lyrics'

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
  const form  = await req.formData()
  const files = form.getAll('file').filter((f): f is File => f instanceof File)
  if (!files.length) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

  try {
    const jsonFile = files.find(f => f.name.toLowerCase().endsWith('.json'))
    const songs = jsonFile ? await parseJson(jsonFile) : await parseSqliteDbs(files)

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

type Db = import('better-sqlite3').Database

/** Open every uploaded .db read-only; EasyWorship needs Songs.db + SongWords.db together */
async function parseSqliteDbs(files: File[]): Promise<SongData[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BetterSqlite = require('better-sqlite3') as typeof import('better-sqlite3')
  const tmpPaths: string[] = []
  const dbs: Array<{ name: string; db: Db }> = []
  try {
    for (const file of files) {
      const tmpPath = join(tmpdir(), `ep_import_${randomUUID()}.db`)
      tmpPaths.push(tmpPath)
      writeFileSync(tmpPath, Buffer.from(await file.arrayBuffer()))
      try {
        dbs.push({ name: file.name, db: new BetterSqlite(tmpPath, { readonly: true }) })
      } catch {
        throw new Error(`${file.name} bukan file database SQLite yang valid`)
      }
    }

    // EasyWorship 6/7: Songs.db (table "song") + SongWords.db (table "word", RTF lyrics)
    const songsDb = dbs.find(d => isEwSongsDb(d.db))
    const wordsDb = dbs.find(d => isEwWordsDb(d.db))
    if (songsDb && wordsDb) return extractEasyWorship(songsDb.db, wordsDb.db)
    if (songsDb && !wordsDb && !hasLyricsColumn(songsDb.db, 'song')) {
      throw new Error('Ini Songs.db EasyWorship — liriknya ada di SongWords.db. Pilih Songs.db dan SongWords.db bersamaan.')
    }
    if (wordsDb && !songsDb) {
      throw new Error('Ini SongWords.db EasyWorship — judul lagunya ada di Songs.db. Pilih Songs.db dan SongWords.db bersamaan.')
    }

    return dbs.flatMap(d => extractSongs(d.db))
  } finally {
    dbs.forEach(d => d.db.close())
    tmpPaths.forEach(p => { if (existsSync(p)) unlinkSync(p) })
  }
}

// ── EasyWorship 6/7 ───────────────────────────────────────────────────────────

function isEwSongsDb(db: Db): boolean {
  return getTables(db).some(t => t.toLowerCase() === 'song') &&
    pickCol(getTableCols(db, 'song'), ['title']) !== null
}

function isEwWordsDb(db: Db): boolean {
  if (!getTables(db).some(t => t.toLowerCase() === 'word')) return false
  const cols = getTableCols(db, 'word')
  return pickCol(cols, ['song_id']) !== null && pickCol(cols, ['words']) !== null
}

function hasLyricsColumn(db: Db, table: string): boolean {
  return pickCol(getTableCols(db, table), ['lyrics', 'text', 'content', 'words']) !== null
}

function extractEasyWorship(songsDb: Db, wordsDb: Db): SongData[] {
  const authorCol = pickCol(getTableCols(songsDb, 'song'), ['author', 'artist'])
  const songs = songsDb.prepare(
    `SELECT rowid AS id, title${authorCol ? `, "${authorCol}" AS author` : ''} FROM song`
  ).all() as { id: number; title: string | null; author?: string | null }[]
  const getWords = wordsDb.prepare('SELECT words FROM word WHERE song_id = ? ORDER BY rowid LIMIT 1')

  return songs.map(song => {
    const row  = getWords.get(song.id) as { words: string | Buffer | null } | undefined
    const raw  = row?.words == null ? '' : Buffer.isBuffer(row.words) ? row.words.toString('latin1') : row.words
    const text = rtfToText(raw)
    return {
      title:  (song.title ?? '').trim(),
      artist: (song.author ?? '').trim(),
      // EasyWorship: a label line ("Verse 1", "Chorus") starts a section, blank line = new slide
      slides: parseLyrics(text),
    }
  }).filter(s => s.title && s.slides.length > 0)
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
