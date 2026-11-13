'use client'

import { useState, useRef, useEffect } from 'react'
import type { ServiceItem } from './types'

interface QuickResult {
  kind: 'bible' | 'service-song' | 'service-scripture'
  label: string
  preview: string
  itemId?: string     // for service matches
  verseText?: string  // for bible lookup
}

interface Props {
  isLive: boolean
  isBlank: boolean
  onGoLive: () => void
  onBlank: () => void
  service: ServiceItem[]
  onQuickLaunch: (text: string, label: string) => void
  onGotoItem: (itemId: string) => void
  onOpenSettings: () => void
}

export function TopBar({ isLive, isBlank, onGoLive, onBlank, service, onQuickLaunch, onGotoItem, onOpenSettings }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<QuickResult[]>([])
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }

    // 1. Local service matches
    const q = query.toLowerCase()
    const local: QuickResult[] = service
      .filter(i => i.title.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q))
      .slice(0, 3)
      .map(i => ({
        kind: i.type === 'song' ? 'service-song' : 'service-scripture',
        label: i.title,
        preview: i.subtitle || i.slides[0]?.text?.substring(0, 50) || '',
        itemId: i.id,
      }))

    // 2. Bible reference detection — Indonesian "Yoh 3:16" and English "John 3:16"
    const looksLikeBible = /^\d?\s*[A-Za-z]{2,}\s+\d+/.test(query.trim())

    if (!looksLikeBible) {
      setResults(local)
      return
    }

    // Debounce API call
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/quick-search?q=${encodeURIComponent(query)}&v=TB`)
        if (res.ok) {
          const data = await res.json() as { found: boolean; label?: string; text?: string }
          if (data.found && data.label && data.text) {
            const bibleResult: QuickResult = {
              kind: 'bible',
              label: data.label,
              preview: data.text.substring(0, 80),
              verseText: data.text,
            }
            setResults([bibleResult, ...local])
          } else {
            setResults(local)
          }
        } else {
          setResults(local)
        }
      } catch {
        setResults(local)
      }
      setLoading(false)
    }, 350)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, service]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && results.length > 0) {
      fireResult(results[0]!)
    }
    if (e.key === 'Escape') { setShow(false); setQuery('') }
  }

  const fireResult = (r: QuickResult) => {
    if (r.kind === 'bible' && r.verseText) {
      onQuickLaunch(r.verseText, r.label)
    } else if (r.itemId) {
      onGotoItem(r.itemId)
    }
    setShow(false)
    setQuery('')
    inputRef.current?.blur()
  }

  const kindIcon = (k: QuickResult['kind']) =>
    k === 'bible' ? '📖' : k === 'service-song' ? '♪' : '✝'

  return (
    <div
      className="flex items-center gap-3 px-4 h-12 flex-shrink-0 relative"
      style={{ background: '#161b27', borderBottom: '1px solid #2a3347', zIndex: 40 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        </div>
        <span className="text-sm font-bold text-white tracking-tight">EasyChurch</span>
        <span className="text-xs text-slate-500 font-medium">Suite</span>
      </div>

      {/* Quick search */}
      <div className="relative flex-1 max-w-sm">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: '#0f1117', border: `1px solid ${show ? '#3b82f6' : '#2a3347'}` }}
        >
          <svg className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setShow(true) }}
            onFocus={() => setShow(true)}
            onBlur={() => setTimeout(() => setShow(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder='Yoh 3:16 · Rm 8:28 · nama lagu... [Enter = langsung live]'
            className="bg-transparent text-xs text-slate-300 placeholder-slate-600 focus:outline-none w-full"
          />
          {loading && <span className="text-[10px] text-slate-500 flex-shrink-0">...</span>}
          {query && (
            <button onClick={() => { setQuery(''); setResults([]) }}
              className="text-slate-600 hover:text-slate-400 flex-shrink-0 text-xs leading-none">
              ×
            </button>
          )}
        </div>

        {/* Dropdown */}
        {show && query.length > 1 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: '#161b27', border: '1px solid #2a3347', zIndex: 50 }}
          >
            {results.length === 0 && !loading && (
              <div className="px-3 py-2.5 text-xs" style={{ color: '#475569' }}>
                Tidak ada hasil — coba "Yoh 3:16" atau nama lagu
              </div>
            )}
            {results.map((r, i) => (
              <button
                key={i}
                onMouseDown={() => fireResult(r)}
                className="w-full text-left px-3 py-2.5 transition-colors hover:bg-slate-800"
                style={{ borderBottom: i < results.length - 1 ? '1px solid #1e2535' : 'none' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{kindIcon(r.kind)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: '#f1f5f9' }}>{r.label}</div>
                    <div className="text-[10px] truncate mt-0.5" style={{ color: '#475569' }}>{r.preview}</div>
                  </div>
                  <span className="text-[9px] flex-shrink-0" style={{ color: '#374151' }}>
                    {r.kind === 'bible' ? 'Enter → Live' : '→ Service'}
                  </span>
                </div>
              </button>
            ))}
            {results.some(r => r.kind === 'bible') && (
              <div className="px-3 py-1.5" style={{ background: '#0f1117', borderTop: '1px solid #1e2535' }}>
                <span className="text-[9px]" style={{ color: '#374151' }}>
                  Enter atau klik → langsung tampil di layar
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Settings */}
      <button onClick={onOpenSettings} title="Settings"
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Blank */}
      <button onClick={onBlank}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={{
          background: isBlank ? '#854d0e' : '#1e2535',
          color:      isBlank ? '#fef3c7' : '#94a3b8',
          border:     `1px solid ${isBlank ? '#a16207' : '#2a3347'}`,
        }}>
        {isBlank ? '■ BLANK' : 'Blank'}
      </button>

      {/* ON AIR toggle */}
      <button onClick={onGoLive}
        className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
        style={{
          background: isLive ? '#dc2626' : '#1d4ed8',
          color:      '#ffffff',
          boxShadow:  isLive ? '0 0 20px rgba(220,38,38,0.4)' : '0 0 12px rgba(29,78,216,0.3)',
        }}>
        <span className="w-2 h-2 rounded-full"
          style={{ background: isLive ? 'white' : '#93c5fd', animation: isLive ? 'pulse 1.5s infinite' : 'none' }} />
        {isLive ? 'ON AIR' : 'Go Live'}
      </button>
    </div>
  )
}
