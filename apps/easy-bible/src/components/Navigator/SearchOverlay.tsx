'use client'

import { useRef, useEffect } from 'react'
import { useBibleSearch } from '@/hooks/useBibleSearch'
import type { SearchHit } from '@easychurch/bible-queries'

interface Props {
  version: string
  onSelectVerse: (hit: SearchHit) => void
  onClose: () => void
}

function HighlightedText({ text }: { text: string }) {
  // text may contain <mark>...</mark> from FTS5 snippet
  return (
    <span
      className="text-sm text-slate-300 leading-relaxed"
      dangerouslySetInnerHTML={{
        __html: text.replace(
          /<mark>/g, '<mark class="bg-yellow-400/30 text-yellow-200 rounded px-0.5">'
        ),
      }}
    />
  )
}

export function SearchOverlay({ version, onSelectVerse, onClose }: Props) {
  const { query, setQuery, clear, hits, loading, error, total } = useBibleSearch(version)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSelect = (hit: SearchHit) => {
    onSelectVerse(hit)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-900 border-b border-slate-700">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3">
          <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari kata atau frasa... (mis: kasih Allah)"
            className="flex-1 bg-transparent text-white text-base focus:outline-none placeholder-slate-500"
          />
          {query && (
            <button onClick={clear} className="text-slate-500 hover:text-white text-sm">✕</button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1 text-sm">
            Tutup
          </button>
        </div>

        {query && !loading && (
          <div className="px-4 pb-2 text-xs text-slate-500">
            {total > 0 ? `${total} hasil ditemukan` : 'Tidak ada hasil'}
            <span className="ml-2 text-slate-600">· {version}</span>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-500 text-sm">Mencari...</div>
          </div>
        )}

        {error && (
          <div className="px-4 py-6 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && hits.length === 0 && query && (
          <div className="px-4 py-12 text-center">
            <p className="text-slate-500 text-sm">Tidak ditemukan untuk &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {!loading && hits.map(hit => (
          <button
            key={hit.id}
            onClick={() => handleSelect(hit)}
            className="w-full text-left px-4 py-3 border-b border-slate-800 hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs font-semibold text-blue-400">
                {hit.bookAbbr} {hit.chapterNumber}:{hit.verseNumber}
              </span>
              <span className="text-xs text-slate-500">{version}</span>
            </div>
            <HighlightedText text={hit.snippet || hit.text} />
          </button>
        ))}

        {!loading && !query && (
          <div className="px-4 py-12 text-center">
            <p className="text-slate-600 text-sm">Ketik untuk mencari di seluruh Alkitab</p>
          </div>
        )}
      </div>
    </div>
  )
}
