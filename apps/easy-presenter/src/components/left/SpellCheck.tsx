'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { SpellIssue } from '@/lib/spell/text'

/** One misspelt word (all its occurrences) with the suggested fix */
export interface WordIssue { word: string; suggestion: string; count: number }

/** Add a word to the church dictionary so it is never flagged again */
export async function addToDictionary(word: string): Promise<void> {
  await fetch('/api/spell/words/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word }),
  }).catch(() => {})
}

/**
 * Debounced server-side spell check of several texts (e.g. lyrics + title).
 * Returns the unique misspelt words across all texts, minus the ones the user ignored.
 */
export function useSpellCheck(texts: string[], ignored: Set<string>, delay = 500) {
  const [raw, setRaw]           = useState<SpellIssue[][]>([])
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState(true)
  const seq = useRef(0)
  const key = JSON.stringify(texts)

  useEffect(() => {
    if (!texts.some(t => t.trim())) { setRaw([]); setChecking(false); return }
    const n = ++seq.current
    setChecking(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/spell/check/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts }),
        })
        const data = await res.json() as { results?: { issues: SpellIssue[] }[] }
        if (n !== seq.current) return
        if (!res.ok || !data.results) { setAvailable(false); setRaw([]); return }
        setAvailable(true)
        setRaw(data.results.map(r => r.issues))
      } catch {
        if (n === seq.current) { setAvailable(false); setRaw([]) }
      } finally {
        if (n === seq.current) setChecking(false)
      }
    }, delay)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, delay])

  const words = useMemo(() => {
    const map = new Map<string, WordIssue>()
    for (const list of raw) {
      for (const i of list) {
        const k = i.word.toLowerCase()
        if (ignored.has(k)) continue
        const cur = map.get(k)
        if (cur) cur.count++
        else map.set(k, { word: i.word, suggestion: i.suggestion, count: 1 })
      }
    }
    return [...map.values()]
  }, [raw, ignored])

  return { words, checking, available }
}

// ── Shared row UI: "Tuahn → Tuhan  [Ganti] [Abaikan] [+ Kamus]" ──

export function WordFixChip({ issue, onFix, onIgnore, onAddDict, busy = false }: {
  issue: WordIssue
  onFix: (to: string) => void
  onIgnore: () => void
  onAddDict: () => void
  busy?: boolean
}) {
  const [to, setTo] = useState(issue.suggestion)
  useEffect(() => setTo(issue.suggestion), [issue.suggestion])

  return (
    <div className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg flex-shrink-0"
      style={{ background: '#1e2535', border: '1px solid #2a3347', opacity: busy ? 0.5 : 1 }}>
      <span className="text-[11px] line-through" style={{ color: '#fca5a5' }}>{issue.word}</span>
      {issue.count > 1 && <span className="text-[9px]" style={{ color: '#64748b' }}>×{issue.count}</span>}
      <span className="text-[10px]" style={{ color: '#64748b' }}>→</span>
      <input
        value={to}
        onChange={e => setTo(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && to.trim()) onFix(to.trim()) }}
        title="Saran perbaikan — bisa diedit"
        className="text-[11px] font-semibold bg-transparent focus:outline-none px-1 rounded"
        style={{ color: '#86efac', width: `${Math.max(4, to.length + 1)}ch`, border: '1px solid transparent' }}
        onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')}
        onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
      />
      <button onClick={() => to.trim() && onFix(to.trim())} disabled={busy}
        title="Ganti semua kata ini" className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
        style={{ background: '#14532d', color: '#86efac' }}>✓</button>
      <button onClick={onIgnore} disabled={busy}
        title="Abaikan (kali ini saja)" className="text-[10px] px-1.5 py-0.5 rounded"
        style={{ background: '#0f1117', color: '#94a3b8' }}>Abaikan</button>
      <button onClick={onAddDict} disabled={busy}
        title="Kata ini benar — simpan ke kamus gereja agar tidak ditandai lagi"
        className="text-[10px] px-1.5 py-0.5 rounded"
        style={{ background: '#0f1117', color: '#93c5fd' }}>+ Kamus</button>
    </div>
  )
}
