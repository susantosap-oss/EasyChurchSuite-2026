import { NextResponse, type NextRequest } from 'next/server'
import { getServerDb } from '@/lib/db.server'
import { getBooksForVersion } from '@easychurch/bible-queries'

export const dynamic = 'force-dynamic'

export function GET(req: NextRequest) {
  const version = req.nextUrl.searchParams.get('v') ?? 'TB'
  try {
    const db = getServerDb()
    const books = getBooksForVersion(db, version)
    if (!books.length) {
      return NextResponse.json({ error: `Version '${version}' not found or has no books` }, { status: 404 })
    }
    return NextResponse.json({ version, books })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
