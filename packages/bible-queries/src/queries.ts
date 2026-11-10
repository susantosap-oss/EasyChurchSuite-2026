import type { DbInstance } from '@easychurch/db'
import type {
  VersionInfo, BookInfo, ChapterInfo, VerseData,
  SearchHit, HighlightData, NoteData,
} from './types.js'

export function getVersions(db: DbInstance): VersionInfo[] {
  return db.prepare(`
    SELECT id, code, name, language, direction,
           is_default as isDefault
    FROM bible_versions
    ORDER BY is_default DESC, code ASC
  `).all() as VersionInfo[]
}

export function getDefaultVersion(db: DbInstance): VersionInfo | null {
  return (db.prepare(`
    SELECT id, code, name, language, direction, is_default as isDefault
    FROM bible_versions
    WHERE is_default = 1
    LIMIT 1
  `).get() ?? db.prepare(`
    SELECT id, code, name, language, direction, is_default as isDefault
    FROM bible_versions ORDER BY id LIMIT 1
  `).get()) as VersionInfo | null
}

export function getBooksForVersion(db: DbInstance, versionCode: string): BookInfo[] {
  return db.prepare(`
    SELECT b.id, b.number, b.code, b.name,
           b.name_abbr AS nameAbbr, b.testament,
           b.total_chapters AS totalChapters
    FROM books b
    JOIN bible_versions v ON b.version_id = v.id
    WHERE v.code = ?
    ORDER BY b.number
  `).all(versionCode) as BookInfo[]
}

export function getBookInfo(db: DbInstance, versionCode: string, bookNumber: number): BookInfo | null {
  return db.prepare(`
    SELECT b.id, b.number, b.code, b.name,
           b.name_abbr AS nameAbbr, b.testament,
           b.total_chapters AS totalChapters
    FROM books b
    JOIN bible_versions v ON b.version_id = v.id
    WHERE v.code = ? AND b.number = ?
  `).get(versionCode, bookNumber) as BookInfo | null
}

export function getChapterInfo(
  db: DbInstance,
  versionCode: string,
  bookNumber: number,
  chapterNumber: number,
): ChapterInfo | null {
  return db.prepare(`
    SELECT c.id, c.number, c.total_verses AS totalVerses
    FROM chapters c
    JOIN books b ON c.book_id = b.id
    JOIN bible_versions v ON b.version_id = v.id
    WHERE v.code = ? AND b.number = ? AND c.number = ?
  `).get(versionCode, bookNumber, chapterNumber) as ChapterInfo | null
}

export function getChapterVerses(
  db: DbInstance,
  versionCode: string,
  bookNumber: number,
  chapterNumber: number,
): VerseData[] {
  return db.prepare(`
    SELECT a.id, a.verse_number AS verseNumber, a.text
    FROM ayat a
    JOIN chapters c ON a.chapter_id = c.id
    JOIN books b ON c.book_id = b.id
    JOIN bible_versions v ON b.version_id = v.id
    WHERE v.code = ? AND b.number = ? AND c.number = ?
    ORDER BY a.verse_number
  `).all(versionCode, bookNumber, chapterNumber) as VerseData[]
}

export function getVerse(
  db: DbInstance,
  versionCode: string,
  bookNumber: number,
  chapterNumber: number,
  verseNumber: number,
): VerseData | null {
  return db.prepare(`
    SELECT a.id, a.verse_number AS verseNumber, a.text
    FROM ayat a
    JOIN chapters c ON a.chapter_id = c.id
    JOIN books b ON c.book_id = b.id
    JOIN bible_versions v ON b.version_id = v.id
    WHERE v.code = ? AND b.number = ? AND c.number = ? AND a.verse_number = ?
  `).get(versionCode, bookNumber, chapterNumber, verseNumber) as VerseData | null
}

/** FTS5 concordance search. Returns up to `limit` hits ranked by relevance. */
export function searchVerses(
  db: DbInstance,
  query: string,
  versionCode: string,
  limit = 50,
): SearchHit[] {
  const q = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => `"${w.replace(/"/g, '')}"`)
    .join(' ')

  if (!q) return []

  try {
    return db.prepare(`
      SELECT
        a.id,
        a.verse_number       AS verseNumber,
        a.text,
        snippet(ayat_fts, 0, '<mark>', '</mark>', '...', 20) AS snippet,
        b.name               AS bookName,
        b.name_abbr          AS bookAbbr,
        b.number             AS bookNumber,
        c.number             AS chapterNumber,
        v.code               AS versionCode
      FROM ayat_fts
      JOIN ayat a    ON ayat_fts.rowid = a.id
      JOIN chapters c ON a.chapter_id = c.id
      JOIN books b    ON c.book_id = b.id
      JOIN bible_versions v ON b.version_id = v.id
      WHERE ayat_fts MATCH ? AND v.code = ?
      ORDER BY rank
      LIMIT ?
    `).all(q, versionCode, limit) as SearchHit[]
  } catch {
    // FTS5 query syntax error — fallback to LIKE search
    const like = `%${query.trim()}%`
    return db.prepare(`
      SELECT
        a.id, a.verse_number AS verseNumber, a.text,
        a.text AS snippet,
        b.name AS bookName, b.name_abbr AS bookAbbr,
        b.number AS bookNumber, c.number AS chapterNumber,
        v.code AS versionCode
      FROM ayat a
      JOIN chapters c ON a.chapter_id = c.id
      JOIN books b ON c.book_id = b.id
      JOIN bible_versions v ON b.version_id = v.id
      WHERE a.text LIKE ? AND v.code = ?
      ORDER BY b.number, c.number, a.verse_number
      LIMIT ?
    `).all(like, versionCode, limit) as SearchHit[]
  }
}

export function getHighlightsForChapter(
  db: DbInstance,
  versionCode: string,
  bookNumber: number,
  chapterNumber: number,
): HighlightData[] {
  return db.prepare(`
    SELECT a.id AS verseId, h.color
    FROM highlights h
    JOIN ayat a ON h.ayat_id = a.id
    JOIN chapters c ON a.chapter_id = c.id
    JOIN books b ON c.book_id = b.id
    JOIN bible_versions v ON b.version_id = v.id
    WHERE v.code = ? AND b.number = ? AND c.number = ?
  `).all(versionCode, bookNumber, chapterNumber) as HighlightData[]
}

export function upsertHighlight(db: DbInstance, verseId: number, color: string): void {
  db.prepare(`
    INSERT INTO highlights(ayat_id, color) VALUES (?, ?)
    ON CONFLICT(ayat_id) DO UPDATE SET color = excluded.color
  `).run(verseId, color)
}

export function removeHighlight(db: DbInstance, verseId: number): void {
  db.prepare('DELETE FROM highlights WHERE ayat_id = ?').run(verseId)
}

export function getNotesForVerse(db: DbInstance, verseId: number): NoteData[] {
  return (db.prepare(`
    SELECT id, ayat_id AS ayatId, content, tags, created_at AS createdAt, updated_at AS updatedAt
    FROM catatan WHERE ayat_id = ? ORDER BY created_at DESC
  `).all(verseId) as Array<NoteData & { tags: string }>)
  .map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }))
}

export function upsertNote(
  db: DbInstance,
  verseId: number,
  content: string,
  tags: string[] = [],
): void {
  db.prepare(`
    INSERT INTO catatan(ayat_id, content, tags) VALUES (?, ?, ?)
    ON CONFLICT DO UPDATE SET
      content = excluded.content,
      tags = excluded.tags,
      updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
  `).run(verseId, content, JSON.stringify(tags))
}
