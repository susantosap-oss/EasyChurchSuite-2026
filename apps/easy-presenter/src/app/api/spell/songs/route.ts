import { NextRequest, NextResponse } from 'next/server'
import { checkSongs } from '@/lib/spell/spell.server'

/** Songs with possible typos. ?ids=1,2,3 limits the check (e.g. just-imported songs) */
export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get('ids')
    const ids = raw ? raw.split(',').map(Number).filter(n => Number.isInteger(n)) : undefined
    return NextResponse.json({ songs: checkSongs(ids) })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 503 })
  }
}
