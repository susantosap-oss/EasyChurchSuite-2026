import { NextRequest, NextResponse } from 'next/server'
import { getPresenterDb } from '@/lib/db.server'

interface ImportVerse  { verse: number; text: string }
interface ImportChapter { number: number; verses: ImportVerse[] }
interface ImportBook {
  number: number
  code: string
  name: string
  name_abbr: string
  testament: 'OT' | 'NT'
  chapters: ImportChapter[]
}
interface ImportPayload {
  version: { code: string; name: string; language?: string }
  books: ImportBook[]
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json() as ImportPayload
    const { version, books } = data

    if (!version?.code || !books?.length) {
      return NextResponse.json({ error: 'Invalid format: needs version.code and books[]' }, { status: 400 })
    }

    const db = getPresenterDb() as unknown as import('better-sqlite3').Database

    let versionRow = db.prepare('SELECT id FROM bible_versions WHERE code = ?').get(version.code) as { id: number } | undefined

    if (!versionRow) {
      const r = db.prepare(
        'INSERT INTO bible_versions(code, name, language) VALUES (?, ?, ?)'
      ).run(version.code.toUpperCase(), version.name, version.language ?? 'id')
      versionRow = { id: r.lastInsertRowid as number }
    }

    const versionId = versionRow.id
    let totalVerses = 0

    const importAll = db.transaction(() => {
      for (const book of books) {
        let bookRow = db.prepare(
          'SELECT id FROM books WHERE version_id = ? AND number = ?'
        ).get(versionId, book.number) as { id: number } | undefined

        if (!bookRow) {
          const r = db.prepare(`
            INSERT INTO books(version_id, number, code, name, name_abbr, testament, total_chapters)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(versionId, book.number, book.code, book.name, book.name_abbr, book.testament, book.chapters.length)
          bookRow = { id: r.lastInsertRowid as number }
        } else {
          db.prepare(
            'UPDATE books SET total_chapters = ? WHERE id = ?'
          ).run(book.chapters.length, bookRow.id)
        }

        const bookId = bookRow.id

        for (const chapter of book.chapters) {
          let chapterRow = db.prepare(
            'SELECT id FROM chapters WHERE book_id = ? AND number = ?'
          ).get(bookId, chapter.number) as { id: number } | undefined

          if (!chapterRow) {
            const r = db.prepare(
              'INSERT INTO chapters(book_id, number, total_verses) VALUES (?, ?, ?)'
            ).run(bookId, chapter.number, chapter.verses.length)
            chapterRow = { id: r.lastInsertRowid as number }
          } else {
            db.prepare(
              'UPDATE chapters SET total_verses = ? WHERE id = ?'
            ).run(chapter.verses.length, chapterRow.id)
          }

          const chapterId = chapterRow.id

          for (const verse of chapter.verses) {
            db.prepare(`
              INSERT INTO ayat(chapter_id, verse_number, text)
              VALUES (?, ?, ?)
              ON CONFLICT(chapter_id, verse_number) DO UPDATE SET text = excluded.text
            `).run(chapterId, verse.verse, verse.text)
            totalVerses++
          }
        }
      }
    })

    importAll()

    return NextResponse.json({
      success: true,
      version: version.code,
      totalBooks: books.length,
      totalVerses,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
