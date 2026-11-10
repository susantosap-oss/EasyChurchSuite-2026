import { NextResponse } from 'next/server'
import { getServerDb } from '@/lib/db.server'
import { getVersions } from '@easychurch/bible-queries'

export const dynamic = 'force-dynamic'

export function GET() {
  try {
    const db = getServerDb()
    const versions = getVersions(db)
    return NextResponse.json({ versions })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
