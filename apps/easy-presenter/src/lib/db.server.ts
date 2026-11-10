// Server-only module — never import from client components
import Database from 'better-sqlite3'
import { existsSync } from 'fs'
import { resolve, join } from 'path'
import type { DbInstance } from '@easychurch/db'

function resolveDbPath(): string {
  if (process.env.DB_PATH) return resolve(process.env.DB_PATH)
  const candidates = [
    join(process.cwd(), '../../data/easy_bible.db'),
    join(process.cwd(), '../data/easy_bible.db'),
    join(process.cwd(), 'data/easy_bible.db'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return candidates[0]!
}

let _db: DbInstance | null = null

export function getPresenterDb(): DbInstance {
  if (_db) return _db
  const dbPath = resolveDbPath()
  if (!existsSync(dbPath)) {
    throw new Error(
      `[EasyPresenter] Database not found at ${dbPath}.\n` +
      `Run: pnpm db:seed-demo  to create the demo database.`
    )
  }
  _db = new Database(dbPath, { readonly: true }) as unknown as DbInstance
  ;(_db as unknown as Database.Database).pragma('journal_mode = WAL')
  ;(_db as unknown as Database.Database).pragma('foreign_keys = ON')
  ;(_db as unknown as Database.Database).pragma('cache_size = -16000')
  return _db
}
