import { NextRequest, NextResponse } from 'next/server'
import { checkText } from '@/lib/spell/spell.server'
import type { SpellLang } from '@/lib/spell/text'

/**
 * { texts: string[], lang?: 'id' | 'en' } → { results: [{ lang, issues }] }
 * The first text decides the language when `lang` is not given (pass the lyrics first).
 */
export async function POST(req: NextRequest) {
  try {
    const { texts, lang } = await req.json() as { texts?: string[]; lang?: SpellLang }
    if (!Array.isArray(texts)) return NextResponse.json({ error: 'texts required' }, { status: 400 })
    let useLang = lang
    const results = texts.map(t => {
      const r = checkText(String(t ?? ''), useLang)
      useLang ??= r.lang
      return r
    })
    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 503 })
  }
}
