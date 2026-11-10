import { NextResponse, type NextRequest } from 'next/server'
import { getServerDb } from '@/lib/db.server'
import { searchVerses } from '@easychurch/bible-queries'

export const dynamic = 'force-dynamic'

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const query   = sp.get('q')?.trim() ?? ''
  const version = sp.get('v') ?? 'TB'
  const limit   = Math.min(parseInt(sp.get('limit') ?? '50', 10), 200)

  if (!query) {
    return NextResponse.json({ query, version, total: 0, hits: [] })
  }

  try {
    const db   = getServerDb()
    const hits = searchVerses(db, query, version, limit)
    return NextResponse.json({ query, version, total: hits.length, hits })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
