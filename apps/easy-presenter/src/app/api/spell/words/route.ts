import { NextRequest, NextResponse } from 'next/server'
import { addCustomWord } from '@/lib/spell/spell.server'

/** Add a word to the church dictionary: { word } */
export async function POST(req: NextRequest) {
  try {
    const { word } = await req.json() as { word?: string }
    if (!word?.trim()) return NextResponse.json({ error: 'word required' }, { status: 400 })
    addCustomWord(word)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 503 })
  }
}
