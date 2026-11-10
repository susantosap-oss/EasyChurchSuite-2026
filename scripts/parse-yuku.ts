#!/usr/bin/env tsx
/**
 * parse-yuku.ts
 * Parses Yuku .YES binary/SQLite Bible files into normalized ParsedVerse[].
 * Yuku format: SQLite3 database with table `Bible` (Book, Chapter, Verse, Scripture)
 * Also handles legacy flat-text .YES format with @-markup.
 *
 * Usage:
 *   tsx scripts/parse-yuku.ts --input ./data/tb.db --version TB --name "Terjemahan Baru"
 *   tsx scripts/parse-yuku.ts --input ./data/ayt.db --version AYT --name "Alkitab Yang Terbuka"
 */

import { existsSync, readFileSync } from 'fs'
import { resolve, extname } from 'path'
import Database from 'better-sqlite3'
import { cleanYukuMarkup, normalizeVerseText, CANONICAL_BOOKS } from '@easychurch/scripture'
import type { ParsedVerse, YukuParseOptions } from '@easychurch/scripture'

interface CliArgs {
  input: string
  version: string
  name: string
  language: string
  direction: 'ltr' | 'rtl'
  output: string
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  const get = (flag: string, def = '') => {
    const idx = args.indexOf(flag)
    return idx !== -1 ? args[idx + 1] ?? def : def
  }

  const input = get('--input')
  if (!input) {
    console.error('Usage: tsx parse-yuku.ts --input <file.db|file.YES> --version <CODE> --name "<Name>"')
    process.exit(1)
  }

  return {
    input: resolve(input),
    version: get('--version', 'TB').toUpperCase(),
    name: get('--name', 'Alkitab'),
    language: get('--language', 'id'),
    direction: (get('--direction', 'ltr') as 'ltr' | 'rtl'),
    output: get('--output', './data/parsed-verses.json'),
  }
}

/** Parse a Yuku SQLite .db file (modern format) */
function parseYukuSqlite(filePath: string, opts: YukuParseOptions): ParsedVerse[] {
  const db = new Database(filePath, { readonly: true })
  const verses: ParsedVerse[] = []

  // Yuku SQLite has table: Bible(Book INTEGER, Chapter INTEGER, Verse INTEGER, Scripture TEXT)
  const rows = db.prepare(`
    SELECT Book, Chapter, Verse, Scripture FROM Bible ORDER BY Book, Chapter, Verse
  `).all() as Array<{ Book: number; Chapter: number; Verse: number; Scripture: string }>

  for (const row of rows) {
    const book = CANONICAL_BOOKS.find(b => b.number === row.Book)
    if (!book) {
      console.warn(`[WARN] Unknown book number: ${row.Book}, skipping`)
      continue
    }

    const textRaw = row.Scripture ?? ''
    const text = normalizeVerseText(cleanYukuMarkup(textRaw))

    if (!text) continue

    verses.push({
      bookNumber: row.Book,
      bookCode: book.code,
      chapterNumber: row.Chapter,
      verseNumber: row.Verse,
      text,
      textRaw: textRaw !== text ? textRaw : undefined,
    })
  }

  db.close()
  console.log(`[INFO] Parsed ${verses.length} verses from SQLite source: ${filePath}`)
  return verses
}

/** Parse legacy Yuku flat-text .YES format */
function parseYukuTextFile(filePath: string, _opts: YukuParseOptions): ParsedVerse[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split(/\r?\n/)
  const verses: ParsedVerse[] = []

  // Format: B C V|Scripture text... (tab or pipe separated)
  // Or: B:C:V Scripture...
  const RE_PIPE = /^(\d+)\t(\d+)\t(\d+)\t(.+)$/
  const RE_COLON = /^(\d+):(\d+):(\d+)\s+(.+)$/

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let m = RE_PIPE.exec(trimmed) ?? RE_COLON.exec(trimmed)
    if (!m) continue

    const bookNum = parseInt(m[1], 10)
    const chapterNum = parseInt(m[2], 10)
    const verseNum = parseInt(m[3], 10)
    const textRaw = m[4] ?? ''

    const book = CANONICAL_BOOKS.find(b => b.number === bookNum)
    if (!book) continue

    const text = normalizeVerseText(cleanYukuMarkup(textRaw))
    if (!text) continue

    verses.push({
      bookNumber: bookNum,
      bookCode: book.code,
      chapterNumber: chapterNum,
      verseNumber: verseNum,
      text,
      textRaw: textRaw !== text ? textRaw : undefined,
    })
  }

  console.log(`[INFO] Parsed ${verses.length} verses from text source: ${filePath}`)
  return verses
}

async function main() {
  const args = parseArgs()

  if (!existsSync(args.input)) {
    console.error(`[ERROR] File not found: ${args.input}`)
    process.exit(1)
  }

  const opts: YukuParseOptions = {
    versionCode: args.version,
    versionName: args.name,
    language: args.language,
    direction: args.direction,
  }

  const ext = extname(args.input).toLowerCase()
  let verses: ParsedVerse[]

  if (ext === '.db' || ext === '.sqlite' || ext === '.sqlite3') {
    verses = parseYukuSqlite(args.input, opts)
  } else {
    verses = parseYukuTextFile(args.input, opts)
  }

  const { writeFileSync } = await import('fs')
  writeFileSync(args.output, JSON.stringify({ version: opts, verses }, null, 2), 'utf-8')

  console.log(`[SUCCESS] Written ${verses.length} verses to: ${args.output}`)
  console.log(`[STATS] Books covered: ${new Set(verses.map(v => v.bookNumber)).size}/66`)
}

main().catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
