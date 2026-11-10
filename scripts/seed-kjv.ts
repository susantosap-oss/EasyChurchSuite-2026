#!/usr/bin/env tsx
/**
 * seed-kjv.ts
 * Downloads the KJV Bible from scrollmapper/bible_databases and seeds it
 * into easy_bible.db with English book names.
 *
 * Usage:
 *   tsx scripts/seed-kjv.ts
 *   tsx scripts/seed-kjv.ts --local ./data/t_kjv.json
 *   tsx scripts/seed-kjv.ts --db ./data/easy_bible.db
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import Database from 'better-sqlite3'

const KJV_JSON_URL =
  'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/KJV.json'

// Always resolve paths relative to this script's location, not process.cwd()
const __filename = fileURLToPath(import.meta.url)
const SCRIPT_DIR = dirname(__filename)
const ROOT       = resolve(SCRIPT_DIR, '..')

const DEFAULT_DB_PATH = resolve(ROOT, 'data/easy_bible.db')
const SCHEMA_PATH     = resolve(ROOT, 'packages/db/src/schema.sql')

// English book names (1-66)
const KJV_BOOKS: Array<{
  number: number; code: string; name: string; nameAbbr: string
  testament: 'OT' | 'NT'; totalChapters: number
}> = [
  { number: 1,  code: 'GEN', name: 'Genesis',          nameAbbr: 'Gen',   testament: 'OT', totalChapters: 50  },
  { number: 2,  code: 'EXO', name: 'Exodus',           nameAbbr: 'Ex',    testament: 'OT', totalChapters: 40  },
  { number: 3,  code: 'LEV', name: 'Leviticus',        nameAbbr: 'Lev',   testament: 'OT', totalChapters: 27  },
  { number: 4,  code: 'NUM', name: 'Numbers',          nameAbbr: 'Num',   testament: 'OT', totalChapters: 36  },
  { number: 5,  code: 'DEU', name: 'Deuteronomy',      nameAbbr: 'Deut',  testament: 'OT', totalChapters: 34  },
  { number: 6,  code: 'JOS', name: 'Joshua',           nameAbbr: 'Josh',  testament: 'OT', totalChapters: 24  },
  { number: 7,  code: 'JDG', name: 'Judges',           nameAbbr: 'Judg',  testament: 'OT', totalChapters: 21  },
  { number: 8,  code: 'RUT', name: 'Ruth',             nameAbbr: 'Ruth',  testament: 'OT', totalChapters: 4   },
  { number: 9,  code: '1SA', name: '1 Samuel',         nameAbbr: '1Sam',  testament: 'OT', totalChapters: 31  },
  { number: 10, code: '2SA', name: '2 Samuel',         nameAbbr: '2Sam',  testament: 'OT', totalChapters: 24  },
  { number: 11, code: '1KI', name: '1 Kings',          nameAbbr: '1Kgs',  testament: 'OT', totalChapters: 22  },
  { number: 12, code: '2KI', name: '2 Kings',          nameAbbr: '2Kgs',  testament: 'OT', totalChapters: 25  },
  { number: 13, code: '1CH', name: '1 Chronicles',     nameAbbr: '1Chr',  testament: 'OT', totalChapters: 29  },
  { number: 14, code: '2CH', name: '2 Chronicles',     nameAbbr: '2Chr',  testament: 'OT', totalChapters: 36  },
  { number: 15, code: 'EZR', name: 'Ezra',             nameAbbr: 'Ezra',  testament: 'OT', totalChapters: 10  },
  { number: 16, code: 'NEH', name: 'Nehemiah',         nameAbbr: 'Neh',   testament: 'OT', totalChapters: 13  },
  { number: 17, code: 'EST', name: 'Esther',           nameAbbr: 'Est',   testament: 'OT', totalChapters: 10  },
  { number: 18, code: 'JOB', name: 'Job',              nameAbbr: 'Job',   testament: 'OT', totalChapters: 42  },
  { number: 19, code: 'PSA', name: 'Psalms',           nameAbbr: 'Ps',    testament: 'OT', totalChapters: 150 },
  { number: 20, code: 'PRO', name: 'Proverbs',         nameAbbr: 'Prov',  testament: 'OT', totalChapters: 31  },
  { number: 21, code: 'ECC', name: 'Ecclesiastes',     nameAbbr: 'Eccl',  testament: 'OT', totalChapters: 12  },
  { number: 22, code: 'SNG', name: 'Song of Solomon',  nameAbbr: 'Song',  testament: 'OT', totalChapters: 8   },
  { number: 23, code: 'ISA', name: 'Isaiah',           nameAbbr: 'Isa',   testament: 'OT', totalChapters: 66  },
  { number: 24, code: 'JER', name: 'Jeremiah',         nameAbbr: 'Jer',   testament: 'OT', totalChapters: 52  },
  { number: 25, code: 'LAM', name: 'Lamentations',     nameAbbr: 'Lam',   testament: 'OT', totalChapters: 5   },
  { number: 26, code: 'EZK', name: 'Ezekiel',          nameAbbr: 'Ezek',  testament: 'OT', totalChapters: 48  },
  { number: 27, code: 'DAN', name: 'Daniel',           nameAbbr: 'Dan',   testament: 'OT', totalChapters: 12  },
  { number: 28, code: 'HOS', name: 'Hosea',            nameAbbr: 'Hos',   testament: 'OT', totalChapters: 14  },
  { number: 29, code: 'JOL', name: 'Joel',             nameAbbr: 'Joel',  testament: 'OT', totalChapters: 3   },
  { number: 30, code: 'AMO', name: 'Amos',             nameAbbr: 'Amos',  testament: 'OT', totalChapters: 9   },
  { number: 31, code: 'OBA', name: 'Obadiah',          nameAbbr: 'Obad',  testament: 'OT', totalChapters: 1   },
  { number: 32, code: 'JON', name: 'Jonah',            nameAbbr: 'Jon',   testament: 'OT', totalChapters: 4   },
  { number: 33, code: 'MIC', name: 'Micah',            nameAbbr: 'Mic',   testament: 'OT', totalChapters: 7   },
  { number: 34, code: 'NAH', name: 'Nahum',            nameAbbr: 'Nah',   testament: 'OT', totalChapters: 3   },
  { number: 35, code: 'HAB', name: 'Habakkuk',         nameAbbr: 'Hab',   testament: 'OT', totalChapters: 3   },
  { number: 36, code: 'ZEP', name: 'Zephaniah',        nameAbbr: 'Zeph',  testament: 'OT', totalChapters: 3   },
  { number: 37, code: 'HAG', name: 'Haggai',           nameAbbr: 'Hag',   testament: 'OT', totalChapters: 2   },
  { number: 38, code: 'ZEC', name: 'Zechariah',        nameAbbr: 'Zech',  testament: 'OT', totalChapters: 14  },
  { number: 39, code: 'MAL', name: 'Malachi',          nameAbbr: 'Mal',   testament: 'OT', totalChapters: 4   },
  { number: 40, code: 'MAT', name: 'Matthew',          nameAbbr: 'Matt',  testament: 'NT', totalChapters: 28  },
  { number: 41, code: 'MRK', name: 'Mark',             nameAbbr: 'Mark',  testament: 'NT', totalChapters: 16  },
  { number: 42, code: 'LUK', name: 'Luke',             nameAbbr: 'Luke',  testament: 'NT', totalChapters: 24  },
  { number: 43, code: 'JHN', name: 'John',             nameAbbr: 'John',  testament: 'NT', totalChapters: 21  },
  { number: 44, code: 'ACT', name: 'Acts',             nameAbbr: 'Acts',  testament: 'NT', totalChapters: 28  },
  { number: 45, code: 'ROM', name: 'Romans',           nameAbbr: 'Rom',   testament: 'NT', totalChapters: 16  },
  { number: 46, code: '1CO', name: '1 Corinthians',    nameAbbr: '1Cor',  testament: 'NT', totalChapters: 16  },
  { number: 47, code: '2CO', name: '2 Corinthians',    nameAbbr: '2Cor',  testament: 'NT', totalChapters: 13  },
  { number: 48, code: 'GAL', name: 'Galatians',        nameAbbr: 'Gal',   testament: 'NT', totalChapters: 6   },
  { number: 49, code: 'EPH', name: 'Ephesians',        nameAbbr: 'Eph',   testament: 'NT', totalChapters: 6   },
  { number: 50, code: 'PHP', name: 'Philippians',      nameAbbr: 'Phil',  testament: 'NT', totalChapters: 4   },
  { number: 51, code: 'COL', name: 'Colossians',       nameAbbr: 'Col',   testament: 'NT', totalChapters: 4   },
  { number: 52, code: '1TH', name: '1 Thessalonians',  nameAbbr: '1Thess',testament: 'NT', totalChapters: 5   },
  { number: 53, code: '2TH', name: '2 Thessalonians',  nameAbbr: '2Thess',testament: 'NT', totalChapters: 3   },
  { number: 54, code: '1TI', name: '1 Timothy',        nameAbbr: '1Tim',  testament: 'NT', totalChapters: 6   },
  { number: 55, code: '2TI', name: '2 Timothy',        nameAbbr: '2Tim',  testament: 'NT', totalChapters: 4   },
  { number: 56, code: 'TIT', name: 'Titus',            nameAbbr: 'Titus', testament: 'NT', totalChapters: 3   },
  { number: 57, code: 'PHM', name: 'Philemon',         nameAbbr: 'Phlm',  testament: 'NT', totalChapters: 1   },
  { number: 58, code: 'HEB', name: 'Hebrews',          nameAbbr: 'Heb',   testament: 'NT', totalChapters: 13  },
  { number: 59, code: 'JAS', name: 'James',            nameAbbr: 'Jas',   testament: 'NT', totalChapters: 5   },
  { number: 60, code: '1PE', name: '1 Peter',          nameAbbr: '1Pet',  testament: 'NT', totalChapters: 5   },
  { number: 61, code: '2PE', name: '2 Peter',          nameAbbr: '2Pet',  testament: 'NT', totalChapters: 3   },
  { number: 62, code: '1JN', name: '1 John',           nameAbbr: '1John', testament: 'NT', totalChapters: 5   },
  { number: 63, code: '2JN', name: '2 John',           nameAbbr: '2John', testament: 'NT', totalChapters: 1   },
  { number: 64, code: '3JN', name: '3 John',           nameAbbr: '3John', testament: 'NT', totalChapters: 1   },
  { number: 65, code: 'JUD', name: 'Jude',             nameAbbr: 'Jude',  testament: 'NT', totalChapters: 1   },
  { number: 66, code: 'REV', name: 'Revelation',       nameAbbr: 'Rev',   testament: 'NT', totalChapters: 22  },
]

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
    local: get('--local'),
    dbPath: get('--db', DEFAULT_DB_PATH),
    cache: get('--cache', resolve(ROOT, 'data/KJV.json')),
  }
}

interface KjvVerse   { verse: number; text: string }
interface KjvChapter { chapter: number; verses: KjvVerse[] }
interface KjvBook    { name: string; chapters: KjvChapter[] }
interface KjvJson    { translation: string; books: KjvBook[] }

async function fetchKjvJson(cacheFile: string): Promise<KjvJson> {
  if (existsSync(cacheFile)) {
    console.log(`[INFO] Loading from cache: ${cacheFile}`)
    return JSON.parse(readFileSync(cacheFile, 'utf-8')) as KjvJson
  }

  console.log(`[INFO] Downloading KJV from scrollmapper...`)
  const res = await fetch(KJV_JSON_URL)
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`)
  const text = await res.text()

  ensureDir(cacheFile)
  writeFileSync(cacheFile, text, 'utf-8')
  console.log(`[INFO] Cached to: ${cacheFile}`)

  return JSON.parse(text) as KjvJson
}

function initDb(dbPath: string): Database.Database {
  ensureDir(dbPath)
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  db.pragma('cache_size = -64000')
  db.pragma('temp_store = MEMORY')

  const schema = readFileSync(SCHEMA_PATH, 'utf-8')
  db.exec(schema)
  console.log(`[INFO] Database ready: ${dbPath}`)
  return db
}

function upsertVersion(db: Database.Database): number {
  const existing = db.prepare('SELECT id FROM bible_versions WHERE code = ?').get('KJV') as { id: number } | undefined
  if (existing) {
    db.prepare('UPDATE bible_versions SET name = ?, language = ? WHERE code = ?')
      .run('King James Version', 'en', 'KJV')
    console.log(`[INFO] KJV version updated (id=${existing.id})`)
    return existing.id
  }
  const result = db.prepare(
    'INSERT INTO bible_versions(code, name, language, direction, is_default) VALUES (?,?,?,?,0)'
  ).run('KJV', 'King James Version', 'en', 'ltr')
  const id = result.lastInsertRowid as number
  console.log(`[INFO] KJV version created (id=${id})`)
  return id
}

function seedBooks(db: Database.Database, versionId: number): Map<number, number> {
  const bookIdMap = new Map<number, number>()
  const insert = db.prepare(
    'INSERT OR IGNORE INTO books(version_id, number, code, name, name_abbr, testament, total_chapters) VALUES (?,?,?,?,?,?,?)'
  )
  for (const b of KJV_BOOKS) {
    insert.run(versionId, b.number, b.code, b.name, b.nameAbbr, b.testament, b.totalChapters)
    const row = db.prepare('SELECT id FROM books WHERE version_id = ? AND number = ?').get(versionId, b.number) as { id: number }
    bookIdMap.set(b.number, row.id)
  }
  console.log(`[INFO] Seeded ${KJV_BOOKS.length} KJV books`)
  return bookIdMap
}

function seedVerses(db: Database.Database, books: KjvBook[], bookIdMap: Map<number, number>): void {
  const insertChapter  = db.prepare('INSERT OR IGNORE INTO chapters(book_id, number) VALUES (?,?)')
  const getChapterId   = db.prepare('SELECT id FROM chapters WHERE book_id = ? AND number = ?')
  const insertVerse    = db.prepare(
    'INSERT OR REPLACE INTO ayat(chapter_id, verse_number, text, text_raw) VALUES (?,?,?,NULL)'
  )
  const updateChCount = db.prepare(
    'UPDATE chapters SET total_verses = (SELECT COUNT(*) FROM ayat WHERE chapter_id = chapters.id) WHERE id = ?'
  )

  let inserted = 0; let skipped = 0
  const chaptersTouched = new Set<number>()
  const chapterCache    = new Map<string, number>()

  const seedAll = db.transaction(() => {
    for (let bi = 0; bi < books.length; bi++) {
      const bookNumber = bi + 1   // books are in canonical order (Genesis=1 … Revelation=66)
      const bookId = bookIdMap.get(bookNumber)
      if (!bookId) { skipped += books[bi]!.chapters.reduce((s, c) => s + c.verses.length, 0); continue }

      for (const ch of books[bi]!.chapters) {
        const key = `${bookId}:${ch.chapter}`
        let chapterId = chapterCache.get(key)
        if (!chapterId) {
          insertChapter.run(bookId, ch.chapter)
          chapterId = (getChapterId.get(bookId, ch.chapter) as { id: number }).id
          chapterCache.set(key, chapterId)
        }
        chaptersTouched.add(chapterId)

        for (const v of ch.verses) {
          if (!v.text?.trim()) { skipped++; continue }
          insertVerse.run(chapterId, v.verse, v.text.trim())
          inserted++
        }
      }
    }

    for (const chapterId of chaptersTouched) {
      updateChCount.run(chapterId)
    }
  })

  seedAll()

  db.prepare(
    'UPDATE books SET total_chapters = (SELECT COUNT(*) FROM chapters WHERE book_id = books.id)'
  ).run()

  console.log(`[INFO] Seeded ${inserted} KJV verses (${skipped} skipped)`)
}

async function main() {
  const args = getArgs()
  const dbPath = args.dbPath

  let kjvJson: KjvJson
  if (args.local) {
    if (!existsSync(args.local)) {
      console.error(`[ERROR] Local file not found: ${args.local}`)
      process.exit(1)
    }
    console.log(`[INFO] Loading local file: ${args.local}`)
    kjvJson = JSON.parse(readFileSync(args.local, 'utf-8')) as KjvJson
  } else {
    kjvJson = await fetchKjvJson(args.cache)
  }

  const books = kjvJson.books
  if (!books?.length) {
    console.error('[ERROR] No books found in KJV JSON — unexpected format')
    process.exit(1)
  }
  const totalVerses = books.reduce((s, b) => s + b.chapters.reduce((s2, c) => s2 + c.verses.length, 0), 0)
  console.log(`[INFO] Parsed ${books.length} books, ~${totalVerses} verses`)

  const db = initDb(dbPath)
  const versionId = upsertVersion(db)
  const bookIdMap = seedBooks(db, versionId)

  seedVerses(db, books, bookIdMap)

  console.log('[INFO] Rebuilding FTS5 index...')
  db.exec("INSERT INTO ayat_fts(ayat_fts) VALUES('rebuild')")
  console.log('[INFO] FTS5 rebuild done')

  const stats = db.prepare('SELECT COUNT(*) as c FROM ayat').get() as { c: number }
  const verStats = db.prepare('SELECT COUNT(*) as c FROM bible_versions').get() as { c: number }
  console.log(`\n[DONE] Database : ${dbPath}`)
  console.log(`       Versions : ${verStats.c}`)
  console.log(`       Total ayat: ${stats.c}`)

  db.close()
}

main().catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
