import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'

export type DbInstance = Database.Database

let _db: DbInstance | null = null

export function getDb(dbPath: string): DbInstance {
  if (_db) return _db

  _db = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
  })

  // Performance pragmas
  _db.pragma('journal_mode = WAL')
  _db.pragma('synchronous = NORMAL')
  _db.pragma('foreign_keys = ON')
  _db.pragma('cache_size = -64000')
  _db.pragma('temp_store = MEMORY')
  _db.pragma('mmap_size = 268435456') // 256MB mmap

  return _db
}

export function initializeSchema(db: DbInstance, schemaPath: string): void {
  const sql = readFileSync(schemaPath, 'utf-8')
  db.exec(sql)
}

export function closeDb(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}

// Query helpers
export type VerseRow = {
  id: number
  verse_number: number
  text: string
  book_name: string
  book_abbr: string
  chapter_number: number
  version_code: string
}

export type SearchResult = VerseRow & { rank: number; snippet: string }
