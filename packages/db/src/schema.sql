-- =====================================================
-- EasyChurch Suite - easy_bible.db Schema
-- SQLite WAL mode + FTS5 for concordance search
-- =====================================================

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA cache_size = -64000; -- 64MB cache
PRAGMA temp_store = MEMORY;

-- -----------------------------------------
-- Bible Versions / Translations
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS bible_versions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,       -- e.g. 'TB', 'AYT', 'KJV', 'NIV'
  name        TEXT NOT NULL,              -- e.g. 'Terjemahan Baru'
  language    TEXT NOT NULL DEFAULT 'id', -- ISO 639-1
  direction   TEXT NOT NULL DEFAULT 'ltr',-- 'ltr' | 'rtl'
  is_default  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- -----------------------------------------
-- Bible Books
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS books (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  version_id   INTEGER NOT NULL REFERENCES bible_versions(id) ON DELETE CASCADE,
  number       INTEGER NOT NULL,           -- canonical book number 1-66
  code         TEXT NOT NULL,              -- e.g. 'GEN', 'EXO'
  name         TEXT NOT NULL,              -- local name e.g. 'Kejadian'
  name_abbr    TEXT NOT NULL,              -- e.g. 'Kej'
  testament    TEXT NOT NULL CHECK(testament IN ('OT','NT')),
  total_chapters INTEGER NOT NULL DEFAULT 0,
  UNIQUE(version_id, number)
);

CREATE INDEX IF NOT EXISTS idx_books_version ON books(version_id);

-- -----------------------------------------
-- Chapters
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS chapters (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id      INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  number       INTEGER NOT NULL,
  total_verses INTEGER NOT NULL DEFAULT 0,
  UNIQUE(book_id, number)
);

CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id);

-- -----------------------------------------
-- Verses (Ayat) — Core Table
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS ayat (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id   INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  verse_number INTEGER NOT NULL,
  text         TEXT NOT NULL,              -- cleaned verse text (no markup)
  text_raw     TEXT,                       -- original with markup (optional archive)
  UNIQUE(chapter_id, verse_number)
);

CREATE INDEX IF NOT EXISTS idx_ayat_chapter ON ayat(chapter_id);

-- -----------------------------------------
-- FTS5 Virtual Table for Concordance Search
-- -----------------------------------------
CREATE VIRTUAL TABLE IF NOT EXISTS ayat_fts USING fts5(
  text,
  content='ayat',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 1'
);

-- FTS5 triggers to keep in sync
CREATE TRIGGER IF NOT EXISTS ayat_fts_insert AFTER INSERT ON ayat BEGIN
  INSERT INTO ayat_fts(rowid, text) VALUES (new.id, new.text);
END;

CREATE TRIGGER IF NOT EXISTS ayat_fts_update AFTER UPDATE ON ayat BEGIN
  INSERT INTO ayat_fts(ayat_fts, rowid, text) VALUES ('delete', old.id, old.text);
  INSERT INTO ayat_fts(rowid, text) VALUES (new.id, new.text);
END;

CREATE TRIGGER IF NOT EXISTS ayat_fts_delete AFTER DELETE ON ayat BEGIN
  INSERT INTO ayat_fts(ayat_fts, rowid, text) VALUES ('delete', old.id, old.text);
END;

-- -----------------------------------------
-- User Notes (Catatan)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS catatan (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ayat_id      INTEGER NOT NULL REFERENCES ayat(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  tags         TEXT,                       -- JSON array of tag strings
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_catatan_ayat ON catatan(ayat_id);

-- FTS5 for note search
CREATE VIRTUAL TABLE IF NOT EXISTS catatan_fts USING fts5(
  content,
  content='catatan',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 1'
);

-- -----------------------------------------
-- Highlights
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS highlights (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ayat_id      INTEGER NOT NULL REFERENCES ayat(id) ON DELETE CASCADE,
  color        TEXT NOT NULL DEFAULT '#FFD700', -- hex color
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(ayat_id)
);

CREATE INDEX IF NOT EXISTS idx_highlights_ayat ON highlights(ayat_id);

-- -----------------------------------------
-- Renungan / Devotional Cache
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS renungan_cache (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  date         TEXT NOT NULL UNIQUE,       -- ISO date YYYY-MM-DD
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,              -- markdown content
  reference    TEXT,                       -- e.g. 'Yohanes 3:16'
  ayat_id      INTEGER REFERENCES ayat(id),
  source       TEXT,                       -- source identifier
  fetched_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_renungan_date ON renungan_cache(date);

-- -----------------------------------------
-- Song Library
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS songs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  artist       TEXT,
  ccli_number  TEXT,
  language     TEXT NOT NULL DEFAULT 'id',
  key_signature TEXT,                      -- e.g. 'C', 'G', 'Am'
  time_signature TEXT DEFAULT '4/4',
  tempo        INTEGER,                    -- BPM
  tags         TEXT,                       -- JSON array
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- FTS5 for song search
CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts USING fts5(
  title,
  artist,
  content='songs',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 1'
);

-- -----------------------------------------
-- Song Slides (Lyric Slides)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS song_slides (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id      INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  slide_order  INTEGER NOT NULL,
  label        TEXT,                       -- e.g. 'Verse 1', 'Chorus', 'Bridge'
  lyrics       TEXT NOT NULL,              -- plain text lyrics
  chords       TEXT,                       -- chord markup text
  UNIQUE(song_id, slide_order)
);

CREATE INDEX IF NOT EXISTS idx_slides_song ON song_slides(song_id);

-- -----------------------------------------
-- Presentation Playlists
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS playlists (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  service_date TEXT,
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS playlist_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id  INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  item_order   INTEGER NOT NULL,
  item_type    TEXT NOT NULL CHECK(item_type IN ('song','scripture','announcement','media')),
  item_ref_id  INTEGER,                   -- references songs.id or other tables
  metadata     TEXT,                      -- JSON for extra config
  UNIQUE(playlist_id, item_order)
);

CREATE INDEX IF NOT EXISTS idx_playlist_items ON playlist_items(playlist_id);

-- -----------------------------------------
-- App Settings (Key-Value Store)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  key          TEXT PRIMARY KEY,
  value        TEXT NOT NULL,
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Default settings
INSERT OR IGNORE INTO app_settings(key, value) VALUES
  ('app.version', '0.1.0'),
  ('display.font_size', '48'),
  ('display.font_family', 'Inter'),
  ('display.text_color', '#FFFFFF'),
  ('display.background_color', '#000000'),
  ('display.text_shadow', '1'),
  ('notification.daily_devotional', '1'),
  ('notification.time', '06:00'),
  ('sync.websocket_port', '7777'),
  ('bible.default_version', 'TB'),
  ('presenter.output_screen', '1');
