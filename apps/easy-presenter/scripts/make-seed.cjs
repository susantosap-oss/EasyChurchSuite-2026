// Builds the installer's starter database (vendor/seed/easy_bible.db) from the dev database:
// keeps the Bible versions (TB + KJV) and default settings, drops songs, playlists, notes and
// per-PC presenter settings that were created while testing.
//   node scripts/make-seed.cjs [source.db]
const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const root = path.resolve(__dirname, '..')
const src  = path.resolve(process.argv[2] || path.join(root, '../../data/easy_bible.db'))
const out  = path.join(root, 'vendor/seed/easy_bible.db')

fs.mkdirSync(path.dirname(out), { recursive: true })
for (const f of [out, `${out}-wal`, `${out}-shm`]) fs.rmSync(f, { force: true })

// VACUUM INTO makes a consistent copy even while the dev server holds the WAL open
new Database(src, { readonly: true }).exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`)

const db = new Database(out)
db.pragma('foreign_keys = ON')
db.transaction(() => {
  for (const t of ['playlist_items', 'playlists', 'song_slides', 'songs', 'catatan', 'highlights', 'renungan_cache']) {
    db.exec(`DELETE FROM ${t}`)
  }
  db.exec("DELETE FROM app_settings WHERE key = 'presenter.settings'")
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('songs','song_slides','playlists','playlist_items','catatan','highlights','renungan_cache')")
  // External-content FTS tables: rebuild from their (now empty) source tables
  db.exec("INSERT INTO songs_fts(songs_fts) VALUES('rebuild')")
  db.exec("INSERT INTO catatan_fts(catatan_fts) VALUES('rebuild')")
})()
db.pragma('journal_mode = DELETE')
db.exec('VACUUM')

const count = sql => db.prepare(sql).get().c
console.log(`[seed] ${out}`)
console.log(`  versions: ${db.prepare('SELECT code FROM bible_versions').all().map(r => r.code).join(', ')}`)
console.log(`  verses: ${count('SELECT count(*) c FROM ayat')}, songs: ${count('SELECT count(*) c FROM songs')}`)
console.log(`  size: ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`)
db.close()
