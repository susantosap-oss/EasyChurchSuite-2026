'use client'

import { useState, useEffect, useRef } from 'react'

// Curated Windows system fonts (fallback if queryLocalFonts unavailable)
const FALLBACK_FONTS: { name: string; category: string }[] = [
  // Sans-serif
  { name: 'Segoe UI',              category: 'Sans-serif' },
  { name: 'Segoe UI Light',        category: 'Sans-serif' },
  { name: 'Segoe UI Semibold',     category: 'Sans-serif' },
  { name: 'Arial',                 category: 'Sans-serif' },
  { name: 'Arial Black',           category: 'Sans-serif' },
  { name: 'Arial Narrow',          category: 'Sans-serif' },
  { name: 'Calibri',               category: 'Sans-serif' },
  { name: 'Calibri Light',         category: 'Sans-serif' },
  { name: 'Century Gothic',        category: 'Sans-serif' },
  { name: 'Franklin Gothic Medium',category: 'Sans-serif' },
  { name: 'Gill Sans MT',          category: 'Sans-serif' },
  { name: 'Microsoft Sans Serif',  category: 'Sans-serif' },
  { name: 'Tahoma',                category: 'Sans-serif' },
  { name: 'Trebuchet MS',          category: 'Sans-serif' },
  { name: 'Verdana',               category: 'Sans-serif' },
  // Serif
  { name: 'Book Antiqua',          category: 'Serif' },
  { name: 'Bookman Old Style',     category: 'Serif' },
  { name: 'Cambria',               category: 'Serif' },
  { name: 'Constantia',            category: 'Serif' },
  { name: 'Garamond',              category: 'Serif' },
  { name: 'Georgia',               category: 'Serif' },
  { name: 'Palatino Linotype',     category: 'Serif' },
  { name: 'Times New Roman',       category: 'Serif' },
  // Display / Worship
  { name: 'Impact',                category: 'Display' },
  { name: 'Rockwell',              category: 'Display' },
  { name: 'Rockwell Extra Bold',   category: 'Display' },
  { name: 'Broadway',              category: 'Display' },
  { name: 'Cooper Black',          category: 'Display' },
  { name: 'Bauhaus 93',            category: 'Display' },
  // Script / Handwriting
  { name: 'Segoe Script',          category: 'Script' },
  { name: 'Comic Sans MS',         category: 'Script' },
  { name: 'Lucida Calligraphy',    category: 'Script' },
  { name: 'Lucida Handwriting',    category: 'Script' },
  { name: 'Freestyle Script',      category: 'Script' },
  // Monospace
  { name: 'Consolas',              category: 'Monospace' },
  { name: 'Courier New',           category: 'Monospace' },
  { name: 'Lucida Console',        category: 'Monospace' },
]

const GENERIC_SUFFIX: Record<string, string> = {
  'Sans-serif': ', sans-serif',
  'Serif':      ', serif',
  'Display':    ', fantasy',
  'Script':     ', cursive',
  'Monospace':  ', monospace',
}

interface FontEntry { name: string; category: string }

interface Props {
  currentFont: string
  onSelect: (cssFontStack: string) => void
  onClose: () => void
}

export function FontPickerModal({ currentFont, onSelect, onClose }: Props) {
  const [fonts, setFonts]       = useState<FontEntry[]>(FALLBACK_FONTS)
  const [q, setQ]               = useState('')
  const [category, setCategory] = useState<string>('All')
  const [loading, setLoading]   = useState(true)
  const searchRef               = useRef<HTMLInputElement>(null)

  useEffect(() => { searchRef.current?.focus() }, [])

  // Try to load actual system fonts via queryLocalFonts API
  useEffect(() => {
    const loadSystem = async () => {
      try {
        if ('queryLocalFonts' in window) {
          const raw = await (window as unknown as { queryLocalFonts: () => Promise<{ family: string }[]> }).queryLocalFonts()
          const names = [...new Set(raw.map(f => f.family))].sort() as string[]
          const mapped: FontEntry[] = names.map(name => ({ name, category: 'System' }))
          setFonts([...FALLBACK_FONTS, ...mapped.filter(f => !FALLBACK_FONTS.some(fb => fb.name === f.name))])
        }
      } catch { /* queryLocalFonts not available or denied — keep fallback */ }
      finally { setLoading(false) }
    }
    loadSystem()
  }, [])

  const categories = ['All', ...Array.from(new Set(fonts.map(f => f.category)))]

  const filtered = fonts.filter(f => {
    const matchQ    = !q || f.name.toLowerCase().includes(q.toLowerCase())
    const matchCat  = category === 'All' || f.category === category
    return matchQ && matchCat
  })

  // Extract display name from current CSS font stack
  const currentName = currentFont.replace(/,.*$/, '').replace(/['"]/g, '').trim()

  const pickFont = (entry: FontEntry) => {
    const suffix = GENERIC_SUFFIX[entry.category] ?? ', sans-serif'
    onSelect(`"${entry.name}"${suffix}`)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{ width: 500, height: '80vh', background: '#161b27', border: '1px solid #2a3347' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ background: '#1a2235', borderBottom: '1px solid #2a3347' }}>
          <h2 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>Pilih Font</h2>
          <div className="flex items-center gap-2">
            {loading && <span className="text-[10px]" style={{ color: '#475569' }}>Memuat sistem…</span>}
            <button onClick={onClose} className="text-lg leading-none" style={{ color: '#475569' }}>×</button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <input
            ref={searchRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Cari nama font…"
            className="w-full px-3 py-1.5 rounded-lg text-sm focus:outline-none"
            style={{ background: '#0f1117', border: '1px solid #2a3347', color: '#f1f5f9' }}
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-3 pb-2 flex-shrink-0 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
              style={{
                background: category === cat ? '#1d4ed8' : '#1e2535',
                color:      category === cat ? '#fff'    : '#64748b',
                border:     `1px solid ${category === cat ? '#2563eb' : '#2a3347'}`,
              }}
            >{cat}</button>
          ))}
        </div>

        {/* Font list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {filtered.map(entry => {
            const isActive = entry.name === currentName
            return (
              <button
                key={entry.name}
                onClick={() => pickFont(entry)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-left transition-colors"
                style={{
                  background: isActive ? '#1e3a5f' : 'transparent',
                  border:     `1px solid ${isActive ? '#2563eb' : 'transparent'}`,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#1e2535' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Font name rendered in its own typeface */}
                <span
                  className="flex-1 truncate text-sm"
                  style={{ fontFamily: `"${entry.name}"`, color: isActive ? '#93c5fd' : '#e2e8f0' }}
                >
                  {entry.name}
                </span>
                <span className="text-[9px] flex-shrink-0" style={{ color: '#374151' }}>
                  {entry.category}
                </span>
                {isActive && <span className="text-[9px] flex-shrink-0" style={{ color: '#3b82f6' }}>✓</span>}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-xs" style={{ color: '#475569' }}>
              Tidak ada font yang cocok
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
