import { NextResponse } from 'next/server'
import { getVersions } from '@easychurch/bible-queries'
import { getPresenterDb } from '@/lib/db.server'

// Reads live data — never prerender at build time
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getPresenterDb()
    const versions = getVersions(db)
    return NextResponse.json({ versions })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ versions: [], error: msg }, { status: 503 })
  }
}
