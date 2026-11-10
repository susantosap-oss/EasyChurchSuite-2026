'use client'

import { useState, useRef, useCallback } from 'react'
import type { TextDirection } from '@easychurch/scripture'
import type { VerseRef } from './SplitBibleView'
import type { SearchHit } from '@easychurch/bible-queries'
import { useBibleChapter } from '@/hooks/useBibleChapter'
import { BibleClient } from '@/lib/bible-client'
import { BookChapterPicker } from '../Navigator/BookChapterPicker'
import { SearchOverlay } from '../Navigator/SearchOverlay'

interface VersePaneProps {
  paneId: 'left' | 'right'
  versionCode: string
  direction: TextDirection
  currentRef: VerseRef | null
  onVerseSelect: (ref: VerseRef) => void
  onVersionChange: (version: string) => void
  onNavigate: (bookNumber: number, chapterNumber: number) => void
  bookNumber: number
  chapterNumber: number
  className?: string
}

const VERSIONS = ['TB', 'AYT', 'KJV', 'NIV', 'NLT']

const HIGHLIGHT_COLORS = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa']

export function VersePane({
  paneId,
  versionCode,
  direction,
  currentRef,
  onVerseSelect,
  onVersionChange,
  onNavigate,
  bookNumber,
  chapterNumber,
  className = '',
}: VersePaneProps) {
  const [selectedVerseNum, setSelectedVerseNum] = useState<number | null>(null)
  const [fontSize, setFontSize]   = useState(16)
  const [showPicker, setShowPicker]   = useState(false)
  const [showSearch, setShowSearch]   = useState(false)
  const [highlights, setHighlights]   = useState<Record<number, string>>({})
  const [highlightMenuVerse, setHighlightMenuVerse] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data, loading, error } = useBibleChapter(versionCode, bookNumber, chapterNumber)

  // Merge server highlights with local optimistic updates
  const effectiveHighlights = { ...(data?.highlights ?? {}), ...highlights }

  const handleVerseClick = useCallback((verseId: number, verseNum: number, text: string) => {
    setSelectedVerseNum(verseNum)
    setHighlightMenuVerse(null)
    if (!data) return
    onVerseSelect({
      bookCode: '', // filled by parent from bookInfo
      bookName: data.bookName,
      bookAbbr: data.bookAbbr,
      chapter: chapterNumber,
      verse: verseNum,
      text,
      versionCode,
      bookNumber,
      verseId,
    })
  }, [data, chapterNumber, versionCode, bookNumber, onVerseSelect])

  const handleHighlight = useCallback(async (verseId: number, verseNum: number, color: string) => {
    setHighlights(h => ({ ...h, [verseId]: color }))
    setHighlightMenuVerse(null)
    try {
      await BibleClient.setHighlight(verseId, color)
    } catch {
      setHighlights(h => { const n = { ...h }; delete n[verseId]; return n })
    }
  }, [])

  const handleRemoveHighlight = useCallback(async (verseId: number) => {
    const prev = highlights[verseId]
    setHighlights(h => { const n = { ...h }; delete n[verseId]; return n })
    setHighlightMenuVerse(null)
    try {
      await BibleClient.removeHighlight(verseId)
    } catch {
      if (prev) setHighlights(h => ({ ...h, [verseId]: prev }))
    }
  }, [highlights])

  const handleSearchSelect = useCallback((hit: SearchHit) => {
    onNavigate(hit.bookNumber, hit.chapterNumber)
    // Verse will be selected after navigation
  }, [onNavigate])

  const prevChapter = () => {
    if (chapterNumber > 1) onNavigate(bookNumber, chapterNumber - 1)
    else if (bookNumber > 1) onNavigate(bookNumber - 1, 1)
  }
  const nextChapter = () => {
    if (data && chapterNumber < data.totalChapters) onNavigate(bookNumber, chapterNumber + 1)
    else if (bookNumber < 66) onNavigate(bookNumber + 1, 1)
  }

  return (
    <div className={`flex flex-col bg-slate-950 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-slate-800 bg-slate-900 flex-shrink-0">
        {/* Version selector */}
        <select
          value={versionCode}
          onChange={e => onVersionChange(e.target.value)}
          className="text-xs bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-blue-500 flex-shrink-0"
        >
          {VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        {/* Book+Chapter nav button */}
        <button
          onClick={() => setShowPicker(true)}
          className="flex-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded px-2 py-1 text-center truncate transition-colors"
        >
          {data ? `${data.bookName} ${chapterNumber}` : loading ? '...' : 'Pilih Kitab'}
        </button>

        {/* Prev / Next chapter */}
        <button onClick={prevChapter} className="p-1 text-slate-500 hover:text-white transition-colors" title="Pasal sebelumnya">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button onClick={nextChapter} className="p-1 text-slate-500 hover:text-white transition-colors" title="Pasal berikutnya">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Search */}
        <button onClick={() => setShowSearch(true)} className="p-1 text-slate-500 hover:text-white transition-colors" title="Cari (Konkordansi)">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Font size */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => setFontSize(s => Math.max(12, s - 2))}
            className="w-5 h-5 text-slate-500 hover:text-white bg-slate-800 rounded text-xs flex items-center justify-center">
            A
          </button>
          <button onClick={() => setFontSize(s => Math.min(32, s + 2))}
            className="w-6 h-6 text-slate-400 hover:text-white bg-slate-800 rounded flex items-center justify-center">
            A
          </button>
        </div>
      </div>

      {/* Verse list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2"
        dir={direction}
        onClick={() => setHighlightMenuVerse(null)}
      >
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col gap-2 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-800/60 rounded-lg animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="py-8 px-4 text-center">
            <p className="text-red-400 text-sm mb-2">{error}</p>
            <p className="text-slate-600 text-xs">
              Pastikan database sudah di-seed:<br />
              <code className="text-slate-400">pnpm db:seed-demo</code>
            </p>
          </div>
        )}

        {/* Verses */}
        {!loading && data?.verses.map(verse => {
          const hlColor = effectiveHighlights[verse.id]
          const isSelected = selectedVerseNum === verse.verseNumber

          return (
            <div key={verse.id} className="relative">
              <button
                onClick={() => handleVerseClick(verse.id, verse.verseNumber, verse.text)}
                onContextMenu={e => {
                  e.preventDefault()
                  setHighlightMenuVerse(verse.id)
                  setSelectedVerseNum(verse.verseNumber)
                }}
                className={`w-full text-left rounded-lg px-3 py-2 mb-0.5 transition-colors group ${
                  isSelected
                    ? 'bg-blue-900/50 ring-1 ring-blue-500'
                    : 'hover:bg-slate-800/50'
                }`}
                style={{
                  direction,
                  backgroundColor: hlColor ? `${hlColor}22` : undefined,
                  borderLeft: hlColor ? `3px solid ${hlColor}` : undefined,
                }}
              >
                <span className={`text-xs font-bold mr-2 ${
                  isSelected ? 'text-blue-400' : 'text-slate-500'
                }`}>
                  {verse.verseNumber}
                </span>
                <span className="text-slate-100 leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
                  {verse.text}
                </span>
              </button>

              {/* Highlight context menu */}
              {highlightMenuVerse === verse.id && (
                <div
                  className="absolute left-3 top-full z-20 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 flex gap-2"
                  onClick={e => e.stopPropagation()}
                >
                  {HIGHLIGHT_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => handleHighlight(verse.id, verse.verseNumber, color)}
                      className="w-6 h-6 rounded-full border-2 border-transparent hover:border-white transition-all"
                      style={{ backgroundColor: color }}
                      title={`Tandai warna ${color}`}
                    />
                  ))}
                  {hlColor && (
                    <button
                      onClick={() => handleRemoveHighlight(verse.id)}
                      className="w-6 h-6 rounded-full bg-slate-700 text-slate-400 hover:text-white text-xs flex items-center justify-center"
                      title="Hapus highlight"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Send to Presenter footer */}
      {selectedVerseNum !== null && data && (
        <div className="px-3 py-2 border-t border-slate-800 bg-slate-900 flex-shrink-0">
          <div className="text-xs text-slate-500 mb-1 truncate">
            {data.bookName} {chapterNumber}:{selectedVerseNum} · {versionCode}
          </div>
          <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
            Kirim ke EasyPresenter
          </button>
        </div>
      )}

      {/* Modals */}
      {showPicker && (
        <BookChapterPicker
          version={versionCode}
          currentBook={bookNumber}
          currentChapter={chapterNumber}
          onSelect={(b, c) => onNavigate(b, c)}
          onClose={() => setShowPicker(false)}
        />
      )}
      {showSearch && (
        <SearchOverlay
          version={versionCode}
          onSelectVerse={handleSearchSelect}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  )
}
