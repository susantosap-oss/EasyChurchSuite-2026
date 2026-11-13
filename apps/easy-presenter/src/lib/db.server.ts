// Server-only module — never import from client components
import Database from 'better-sqlite3'
import { existsSync } from 'fs'
import { resolve, join, dirname } from 'path'
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

/** Directory next to the database for persisted files (uploaded backgrounds, …) */
export function getDataDir(): string {
  return dirname(resolveDbPath())
}

// Additive migrations for databases created before a column existed
function migrate(db: Database.Database) {
  const songCols = db.prepare('PRAGMA table_info(songs)').all() as { name: string }[]
  if (songCols.length && !songCols.some(c => c.name === 'settings')) {
    db.exec('ALTER TABLE songs ADD COLUMN settings TEXT')
  }
}

export function getPresenterDb(): DbInstance {
  if (_db) return _db
  const dbPath = resolveDbPath()
  if (!existsSync(dbPath)) {
    throw new Error(
      `[EasyPresenter] Database not found at ${dbPath}.\n` +
      `Run: pnpm db:seed-demo  to create the demo database.`
    )
  }
  _db = new Database(dbPath) as unknown as DbInstance
  ;(_db as unknown as Database.Database).pragma('journal_mode = WAL')
  ;(_db as unknown as Database.Database).pragma('foreign_keys = ON')
  ;(_db as unknown as Database.Database).pragma('cache_size = -16000')
  migrate(_db as unknown as Database.Database)
  return _db
}
