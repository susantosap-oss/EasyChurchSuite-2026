import { NextResponse } from 'next/server'
import { getBooksForVersion } from '@easychurch/bible-queries'
import { getPresenterDb } from '@/lib/db.server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const v = (searchParams.get('v') ?? 'TB').toUpperCase()
  try {
    const db = getPresenterDb()
    const books = getBooksForVersion(db, v)
    return NextResponse.json({ version: v, books })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ version: v, books: [], error: msg }, { status: 503 })
  }
}
