// Server-only module — never import from client components
import Database from 'better-sqlite3'
import { readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import type { DbInstance } from '@easychurch/db'

function resolveDbPath(): string {
  if (process.env.DB_PATH) return resolve(process.env.DB_PATH)
  // Walk up from Next.js CWD (apps/easy-bible) to find data/easy_bible.db
  const candidates = [
    join(process.cwd(), '../../data/easy_bible.db'),
    join(process.cwd(), '../data/easy_bible.db'),
    join(process.cwd(), 'data/easy_bible.db'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  // Return preferred path even if not yet created (seed-demo will create it)
  return candidates[0]!
}

let _db: DbInstance | null = null

export function getServerDb(): DbInstance {
  if (_db) return _db

  const dbPath = resolveDbPath()

  if (!existsSync(dbPath)) {
    throw new Error(
      `[EasyBible] Database not found at ${dbPath}.\n` +
      `Run: pnpm db:seed-demo  (from project root) to create a demo database.`
    )
  }

  _db = new Database(dbPath, { readonly: true })
  _db.pragma('journal_mode = WAL')
  _db.pragma('synchronous = NORMAL')
  _db.pragma('foreign_keys = ON')
  _db.pragma('cache_size = -32000')
  _db.pragma('temp_store = MEMORY')
  _db.pragma('mmap_size = 134217728') // 128MB

  return _db
}
