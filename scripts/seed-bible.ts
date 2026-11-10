#!/usr/bin/env tsx
/**
 * seed-bible.ts
 * Seeds easy_bible.db from a parsed JSON file (output of parse-yuku.ts)
 * or directly from a Yuku SQLite source.
 *
 * Usage:
 *   tsx scripts/seed-bible.ts --json ./data/parsed-verses.json
 *   tsx scripts/seed-bible.ts --source ./data/tb.db --version TB --name "Terjemahan Baru"
 */

import { resolve, join, dirname } from 'path'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import Database from 'better-sqlite3'
import { readFileSync as readSQL } from 'fs'
import { CANONICAL_BOOKS, cleanYukuMarkup, normalizeVerseText } from '@easychurch/scripture'
import type { ParsedVerse } from '@easychurch/scripture'

const DEFAULT_DB_PATH = resolve('./data/easy_bible.db')
const SCHEMA_PATH = resolve('./packages/db/src/schema.sql')

function ensureDir(filePath: string) {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function getArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string, def = '') => {
    const idx = args.indexOf(flag)
    return idx !== -1 ? (args[idx + 1] ?? def) : def
  }
  return {
    json: get('--json'),
    source: get('--source'),
    version: get('--version', 'TB').toUpperCase(),
    name: get('--name', 'Terjemahan Baru'),
    language: get('--language', 'id'),
    direction: get('--direction', 'ltr') as 'ltr' | 'rtl',
    dbPath: get('--db', DEFAULT_DB_PATH),
    rebuild: args.includes('--rebuild'),
  }
}

interface SeedContext {
  db: Database.Database
  versionId: number
  bookIdMap: Map<number, number>     // bookNumber → books.id
  chapterIdMap: Map<string, number>  // `${bookId}:${chapter}` → chapters.id
}

function initDb(dbPath: string, rebuild: boolean): Database.Database {
  ensureDir(dbPath)

  if (rebuild && existsSync(dbPath)) {
    const { unlinkSync } = require('fs')
    unlinkSync(dbPath)
    console.log('[INFO] Removed existing database for rebuild')
  }

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  db.pragma('cache_size = -64000')
  db.pragma('temp_store = MEMORY')

  const schema = readSQL(SCHEMA_PATH, 'utf-8')
  db.exec(schema)
  console.log(`[INFO] Database initialized: ${dbPath}`)
  return db
}

function upsertVersion(db: Database.Database, args: ReturnType<typeof getArgs>): number {
  const existing = db.prepare('SELECT id FROM bible_versions WHERE code = ?').get(args.version) as { id: number } | undefined

  if (existing) {
    console.log(`[INFO] Version '${args.version}' already exists (id=${existing.id}), updating...`)
    db.prepare(`
      UPDATE bible_versions SET name = ?, language = ?, direction = ? WHERE code = ?
    `).run(args.name, args.language, args.direction, args.version)
    return existing.id
  }

  const result = db.prepare(`
    INSERT INTO bible_versions(code, name, language, direction, is_default)
    VALUES (?, ?, ?, ?, 0)
  `).run(args.version, args.name, args.language, args.direction)

  const versionId = result.lastInsertRowid as number
  console.log(`[INFO] Created version '${args.version}' (id=${versionId})`)
  return versionId
}

function seedBooks(db: Database.Database, versionId: number): Map<number, number> {
  const bookIdMap = new Map<number, number>()
  const insert = db.prepare(`
    INSERT OR IGNORE INTO books(version_id, number, code, name, name_abbr, testament, total_chapters)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  for (const book of CANONICAL_BOOKS) {
    insert.run(versionId, book.number, book.code, book.name, book.nameAbbr, book.testament, book.totalChapters)
    const row = db.prepare('SELECT id FROM books WHERE version_id = ? AND number = ?').get(versionId, book.number) as { id: number }
    bookIdMap.set(book.number, row.id)
  }

  console.log(`[INFO] Seeded ${CANONICAL_BOOKS.length} books`)
  return bookIdMap
}

function getOrCreateChapter(
  db: Database.Database,
  bookId: number,
  chapterNum: number,
  cache: Map<string, number>
): number {
  const key = `${bookId}:${chapterNum}`
  if (cache.has(key)) return cache.get(key)!

  db.prepare('INSERT OR IGNORE INTO chapters(book_id, number) VALUES (?, ?)').run(bookId, chapterNum)
  const row = db.prepare('SELECT id FROM chapters WHERE book_id = ? AND number = ?').get(bookId, chapterNum) as { id: number }
  cache.set(key, row.id)
  return row.id
}

function seedVerses(ctx: SeedContext, verses: ParsedVerse[]): void {
  const { db, bookIdMap, chapterIdMap } = ctx

  const insertVerse = db.prepare(`
    INSERT OR REPLACE INTO ayat(chapter_id, verse_number, text, text_raw)
    VALUES (?, ?, ?, ?)
  `)

  const updateChapterCount = db.prepare(`
    UPDATE chapters SET total_verses = (
      SELECT COUNT(*) FROM ayat WHERE chapter_id = chapters.id
    ) WHERE id = ?
  `)

  let inserted = 0
  let skipped = 0
  const chaptersTouched = new Set<number>()

  const seedAll = db.transaction(() => {
    for (const verse of verses) {
      const bookId = bookIdMap.get(verse.bookNumber)
      if (!bookId) { skipped++; continue }

      const chapterId = getOrCreateChapter(db, bookId, verse.chapterNumber, chapterIdMap)
      chaptersTouched.add(chapterId)

      insertVerse.run(chapterId, verse.verseNumber, verse.text, verse.textRaw ?? null)
      inserted++
    }

    // Update chapter verse counts
    for (const chapterId of chaptersTouched) {
      updateChapterCount.run(chapterId)
    }
  })

  seedAll()

  // Update book chapter counts
  db.prepare(`
    UPDATE books SET total_chapters = (
      SELECT COUNT(*) FROM chapters WHERE book_id = books.id
    )
  `).run()

  console.log(`[INFO] Seeded ${inserted} verses (${skipped} skipped)`)
}

function rebuildFts(db: Database.Database): void {
  console.log('[INFO] Rebuilding FTS5 index...')
  db.exec(`INSERT INTO ayat_fts(ayat_fts) VALUES('rebuild')`)
  console.log('[INFO] FTS5 index rebuilt')
}

async function main() {
  const args = getArgs()

  if (!args.json && !args.source) {
    console.error('Usage: tsx seed-bible.ts --json <file.json> OR --source <file.db> [--version TB]')
    process.exit(1)
  }

  const db = initDb(args.dbPath, args.rebuild)
  const versionId = upsertVersion(db, args)
  const bookIdMap = seedBooks(db, versionId)
  const chapterIdMap = new Map<string, number>()
  const ctx: SeedContext = { db, versionId, bookIdMap, chapterIdMap }

  let verses: ParsedVerse[]

  if (args.json) {
    if (!existsSync(args.json)) {
      console.error(`[ERROR] JSON file not found: ${args.json}`)
      process.exit(1)
    }
    const data = JSON.parse(readFileSync(args.json, 'utf-8')) as { verses: ParsedVerse[] }
    verses = data.verses
    console.log(`[INFO] Loaded ${verses.length} verses from JSON`)
  } else {
    // Direct SQLite source (Yuku format)
    const srcDb = new Database(resolve(args.source!), { readonly: true })
    const rows = srcDb.prepare('SELECT Book, Chapter, Verse, Scripture FROM Bible ORDER BY Book, Chapter, Verse').all() as Array<{
      Book: number; Chapter: number; Verse: number; Scripture: string
    }>
    srcDb.close()

    verses = rows.map(r => {
      const book = CANONICAL_BOOKS.find(b => b.number === r.Book)
      const textRaw = r.Scripture ?? ''
      const text = normalizeVerseText(cleanYukuMarkup(textRaw))
      return {
        bookNumber: r.Book,
        bookCode: book?.code ?? '',
        chapterNumber: r.Chapter,
        verseNumber: r.Verse,
        text,
        textRaw: textRaw !== text ? textRaw : undefined,
      } satisfies ParsedVerse
    }).filter(v => v.bookCode && v.text)

    console.log(`[INFO] Loaded ${verses.length} verses from source DB`)
  }

  seedVerses(ctx, verses)
  rebuildFts(db)

  const stats = db.prepare('SELECT COUNT(*) as c FROM ayat').get() as { c: number }
  const verStats = db.prepare('SELECT COUNT(*) as c FROM bible_versions').get() as { c: number }
  console.log(`\n[DONE] Database: ${args.dbPath}`)
  console.log(`       Versions : ${verStats.c}`)
  console.log(`       Total ayat: ${stats.c}`)

  db.close()
}

main().catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
