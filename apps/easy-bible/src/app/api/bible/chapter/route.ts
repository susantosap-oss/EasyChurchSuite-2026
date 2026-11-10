import { NextResponse, type NextRequest } from 'next/server'
import { getServerDb } from '@/lib/db.server'
import {
  getBookInfo,
  getChapterVerses,
  getHighlightsForChapter,
} from '@easychurch/bible-queries'

export const dynamic = 'force-dynamic'

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const version = sp.get('v') ?? 'TB'
  const bookNum = parseInt(sp.get('b') ?? '43', 10)   // default: Yohanes
  const chapNum = parseInt(sp.get('c') ?? '3', 10)    // default: chapter 3

  if (isNaN(bookNum) || isNaN(chapNum) || bookNum < 1 || chapNum < 1) {
    return NextResponse.json({ error: 'Invalid book or chapter number' }, { status: 400 })
  }

  try {
    const db = getServerDb()

    const book = getBookInfo(db, version, bookNum)
    if (!book) {
      return NextResponse.json(
        { error: `Book ${bookNum} not found in version '${version}'` },
        { status: 404 }
      )
    }

    const verses = getChapterVerses(db, version, bookNum, chapNum)
    const rawHighlights = getHighlightsForChapter(db, version, bookNum, chapNum)
    const highlights: Record<number, string> = {}
    for (const h of rawHighlights) highlights[h.verseId] = h.color

    return NextResponse.json({
      version,
      bookNumber: bookNum,
      bookName: book.name,
      bookAbbr: book.nameAbbr,
      chapterNumber: chapNum,
      totalVerses: verses.length,
      totalChapters: book.totalChapters,
      verses,
      highlights,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
