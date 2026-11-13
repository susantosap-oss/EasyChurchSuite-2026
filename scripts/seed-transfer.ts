#!/usr/bin/env tsx
/**
 * seed-transfer.ts
 * Seeds a Bible version into easy_bible.db from an EasyBible "transfer" SQLite
 * file (table ayat_transfer: kitab_id, pasal, ayat, versi, teks).
 *
 * Usage:
 *   tsx scripts/seed-transfer.ts --source ../easystudio-2026/itb-transfer.db --code TB --name "Terjemahan Baru"
 *   tsx scripts/seed-transfer.ts --source ./x.db --versi ITB --code TB --default
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync } from 'fs'
import Database from 'better-sqlite3'
// Relative import: workspace packages aren't linked into the root node_modules
import { CANONICAL_BOOKS } from '../packages/scripture/src/types'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT       = resolve(SCRIPT_DIR, '..')
const SCHEMA_PATH = resolve(ROOT, 'packages/db/src/schema.sql')

function getArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string, def = '') => {
    const idx = args.indexOf(flag)
    return idx !== -1 ? (args[idx + 1] ?? def) : def
  }
  return {
    source:   get('--source'),
    versi:    get('--versi'),                       // filter on ayat_transfer.versi (default: first found)
    code:     get('--code', 'TB').toUpperCase(),
    name:     get('--name', 'Terjemahan Baru'),
    language: get('--language', 'id'),
    dbPath:   resolve(get('--db', resolve(ROOT, 'data/easy_bible.db'))),
    isDefault: args.includes('--default'),
  }
}

interface Row { kitab_id: number; pasal: number; ayat: number; teks: string }

function main() {
  const args = getArgs()
  if (!args.source || !existsSync(args.source)) {
    console.error(`[ERROR] Source not found: ${args.source || '(missing --source)'}`)
    process.exit(1)
  }

  const src = new Database(args.source, { readonly: true })
  const versi = args.versi
    || (src.prepare('SELECT versi FROM ayat_transfer LIMIT 1').get() as { versi: string } | undefined)?.versi
  if (!versi) { console.error('[ERROR] ayat_transfer is empty'); process.exit(1) }

  const rows = src.prepare(
    'SELECT kitab_id, pasal, ayat, teks FROM ayat_transfer WHERE versi = ? ORDER BY kitab_id, pasal, ayat'
  ).all(versi) as Row[]
  src.close()
  console.log(`[INFO] ${rows.length} verses (versi=${versi}) from ${args.source}`)

  const db = new Database(args.dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(readFileSync(SCHEMA_PATH, 'utf-8'))

  db.transaction(() => {
    // Version
    db.prepare(`
      INSERT INTO bible_versions(code, name, language, direction, is_default) VALUES (?,?,?,'ltr',0)
      ON CONFLICT(code) DO UPDATE SET name = excluded.name, language = excluded.language
    `).run(args.code, args.name, args.language)
    const versionId = (db.prepare('SELECT id FROM bible_versions WHERE code = ?').get(args.code) as { id: number }).id
    if (args.isDefault) {
      db.prepare('UPDATE bible_versions SET is_default = (id = ?)').run(versionId)
    }

    // Books
    const upsertBook = db.prepare(`
      INSERT INTO books(version_id, number, code, name, name_abbr, testament, total_chapters) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(version_id, number) DO UPDATE SET
        code = excluded.code, name = excluded.name, name_abbr = excluded.name_abbr, testament = excluded.testament
    `)
    const bookIds = new Map<number, number>()
    for (const b of CANONICAL_BOOKS) {
      upsertBook.run(versionId, b.number, b.code, b.name, b.nameAbbr, b.testament, b.totalChapters)
      bookIds.set(b.number, (db.prepare('SELECT id FROM books WHERE version_id = ? AND number = ?')
        .get(versionId, b.number) as { id: number }).id)
    }

    // Chapters + verses
    const insertChapter = db.prepare('INSERT OR IGNORE INTO chapters(book_id, number) VALUES (?,?)')
    const getChapter    = db.prepare('SELECT id FROM chapters WHERE book_id = ? AND number = ?')
    const upsertVerse   = db.prepare(`
      INSERT INTO ayat(chapter_id, verse_number, text, text_raw) VALUES (?,?,?,NULL)
      ON CONFLICT(chapter_id, verse_number) DO UPDATE SET text = excluded.text
    `)
    const chapterIds = new Map<string, number>()
    let skipped = 0

    for (const r of rows) {
      const bookId = bookIds.get(r.kitab_id)
      const text   = r.teks?.trim()
      if (!bookId || !text) { skipped++; continue }
      const key = `${bookId}:${r.pasal}`
      let chapterId = chapterIds.get(key)
      if (!chapterId) {
        insertChapter.run(bookId, r.pasal)
        chapterId = (getChapter.get(bookId, r.pasal) as { id: number }).id
        chapterIds.set(key, chapterId)
      }
      upsertVerse.run(chapterId, r.ayat, text)
    }

    db.prepare(`
      UPDATE chapters SET total_verses = (SELECT COUNT(*) FROM ayat WHERE chapter_id = chapters.id)
      WHERE book_id IN (SELECT id FROM books WHERE version_id = ?)
    `).run(versionId)
    db.prepare(`
      UPDATE books SET total_chapters = (SELECT COUNT(*) FROM chapters WHERE book_id = books.id)
      WHERE version_id = ?
    `).run(versionId)

    console.log(`[INFO] ${args.code}: ${rows.length - skipped} verses, ${chapterIds.size} chapters (${skipped} skipped)`)
  })()

  db.close()
  console.log(`[DONE] → ${args.dbPath}`)
}

main()
