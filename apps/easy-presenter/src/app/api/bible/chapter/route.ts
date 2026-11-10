import { NextResponse } from 'next/server'
import { getChapterVerses, getBookInfo, getChapterInfo } from '@easychurch/bible-queries'
import { getPresenterDb } from '@/lib/db.server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const v = (searchParams.get('v') ?? 'TB').toUpperCase()
  const b = parseInt(searchParams.get('b') ?? '0', 10)
  const c = parseInt(searchParams.get('c') ?? '1', 10)

  if (!b) return NextResponse.json({ error: 'Book number required' }, { status: 400 })

  try {
    const db      = getPresenterDb()
    const bookInfo = getBookInfo(db, v, b)
    if (!bookInfo) return NextResponse.json({ error: `Book ${b} not found in ${v}` }, { status: 404 })

    const chInfo = getChapterInfo(db, v, b, c)
    const verses  = getChapterVerses(db, v, b, c)

    return NextResponse.json({
      version:       v,
      bookNumber:    b,
      bookName:      bookInfo.name,
      bookAbbr:      bookInfo.nameAbbr,
      chapterNumber: c,
      totalChapters: bookInfo.totalChapters,
      totalVerses:   chInfo?.totalVerses ?? verses.length,
      verses,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
