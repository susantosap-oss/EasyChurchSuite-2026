'use client'

import { useState, useEffect } from 'react'
import type { BookInfo, VerseData, VersionInfo } from '@easychurch/bible-queries'

export interface ScriptureAddPayload {
  title: string
  subtitle: string
  slides: Array<{ label: string; text: string }>
}

interface Props {
  onAdd: (payload: ScriptureAddPayload) => void
  onQuickLaunch: (text: string, label: string) => void
}

type View = 'books' | 'chapters' | 'verses'

export function ScriptureSearch({ onAdd, onQuickLaunch }: Props) {
  const [view, setView]                   = useState<View>('books')
  const [version, setVersion]             = useState('TB')
  const [versions, setVersions]           = useState<VersionInfo[]>([])
  const [books, setBooks]                 = useState<BookInfo[]>([])
  const [q, setQ]                         = useState('')
  const [selectedBook, setSelectedBook]   = useState<BookInfo | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)
  const [verses, setVerses]               = useState<VerseData[]>([])
  const [bookName, setBookName]           = useState('')
  const [bookAbbr, setBookAbbr]           = useState('')
  const [totalChapters, setTotalChapters] = useState(0)
  const [loading, setLoading]             = useState(false)
  const [dbMissing, setDbMissing]         = useState(false)

  // Fetch available versions once
  useEffect(() => {
    fetch('/api/bible/versions/').then(r => r.json()).then(d => {
      if (d.versions?.length) setVersions(d.versions)
    }).catch(() => {})
  }, [])

  // Fetch books when version changes; also re-sync selectedBook
  useEffect(() => {
    setLoading(true)
    setDbMissing(false)
    fetch(`/api/bible/books/?v=${version}`).then(r => r.json()).then(d => {
      const fetched: BookInfo[] = d.books ?? []
      setBooks(fetched)
      if (!fetched.length) setDbMissing(true)
      // Keep selectedBook in sync with new version's data
      if (selectedBook) {
        const updated = fetched.find(b => b.number === selectedBook.number)
        if (updated) setSelectedBook(updated)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  // Fetch verses when entering verse view
  useEffect(() => {
    if (view !== 'verses' || !selectedBook || selectedChapter === null) return
    setLoading(true)
    fetch(`/api/bible/chapter/?v=${version}&b=${selectedBook.number}&c=${selectedChapter}`)
      .then(r => r.json())
      .then(d => {
        setVerses(d.verses ?? [])
        setBookName(d.bookName ?? '')
        setBookAbbr(d.bookAbbr ?? '')
        setTotalChapters(d.totalChapters ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, version, selectedBook?.number, selectedChapter])

  const addChapter = () => {
    if (!selectedBook || selectedChapter === null || !verses.length) return
    const abbr  = bookAbbr || selectedBook.nameAbbr
    const bname = bookName || selectedBook.name
    onAdd({
      title:    `${bname} ${selectedChapter}`,
      subtitle: version,
      slides:   verses.map(v => ({
        label: `${abbr} ${selectedChapter}:${v.verseNumber}`,
        text:  v.text,
      })),
    })
  }

  const addVerse = (v: VerseData) => {
    const abbr  = bookAbbr || (selectedBook?.nameAbbr ?? '')
    const label = `${abbr} ${selectedChapter}:${v.verseNumber}`
    onAdd({ title: label, subtitle: version, slides: [{ label, text: v.text }] })
  }

  // ── Version pill row ──
  const versionPills = (
    <div className="flex gap-1">
      {versions.map(v => (
        <button key={v.code}
          onClick={() => setVersion(v.code)}
          className="px-2 py-0.5 rounded text-[10px] font-bold transition-all"
          style={{
            background: version === v.code ? '#1d4ed8' : '#1e2535',
            color:      version === v.code ? '#fff'    : '#64748b',
            border:     `1px solid ${version === v.code ? '#1d4ed8' : '#2a3347'}`,
          }}>
          {v.code}
        </button>
      ))}
    </div>
  )

  // ══════════════ BOOKS VIEW ══════════════
  if (view === 'books') {
    const otBooks  = books.filter(b => b.testament === 'OT')
    const ntBooks  = books.filter(b => b.testament === 'NT')
    const filter   = (arr: BookInfo[]) =>
      !q.trim() ? arr
        : arr.filter(b =>
            b.name.toLowerCase().includes(q.toLowerCase()) ||
            b.nameAbbr.toLowerCase().includes(q.toLowerCase()))

    return (
      <div className="flex flex-col h-full">
        {/* Search + version */}
        <div className="p-2 flex-shrink-0 space-y-1.5">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
            style={{ background: '#1e2535', border: '1px solid #2a3347' }}>
            <svg className="w-3 h-3 flex-shrink-0" style={{ color: '#475569' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Cari kitab..."
              className="bg-transparent text-xs focus:outline-none w-full"
              style={{ color: '#e2e8f0' }} />
            {q && (
              <button onClick={() => setQ('')}
                className="text-slate-500 hover:text-slate-300 text-xs leading-none flex-shrink-0">×</button>
            )}
          </div>
          {versionPills}
        </div>

        {/* Loading / empty state */}
        {loading && (
          <div className="text-center py-4 text-[10px]" style={{ color: '#475569' }}>Memuat...</div>
        )}
        {!loading && dbMissing && (
          <div className="px-3 py-4 space-y-1">
            <p className="text-[10px] font-semibold" style={{ color: '#ef4444' }}>Data Alkitab belum ada</p>
            <p className="text-[9px]" style={{ color: '#475569' }}>
              Jalankan: <code className="text-yellow-400">pnpm db:seed-kjv</code> di terminal
            </p>
          </div>
        )}

        {/* Book list */}
        {!loading && !dbMissing && (
          <div className="flex-1 overflow-y-auto pb-2">
            {filter(otBooks).length > 0 && (
              <>
                <div className="px-2.5 pt-2 pb-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: '#374151' }}>Perjanjian Lama</span>
                </div>
                {filter(otBooks).map(book => (
                  <BookRow key={book.number} book={book}
                    onSelect={() => { setSelectedBook(book); setView('chapters') }} />
                ))}
              </>
            )}
            {filter(ntBooks).length > 0 && (
              <>
                <div className="px-2.5 pt-2.5 pb-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: '#374151' }}>Perjanjian Baru</span>
                </div>
                {filter(ntBooks).map(book => (
                  <BookRow key={book.number} book={book}
                    onSelect={() => { setSelectedBook(book); setView('chapters') }} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // ══════════════ CHAPTERS VIEW ══════════════
  if (view === 'chapters' && selectedBook) {
    const count = selectedBook.totalChapters
    return (
      <div className="flex flex-col h-full">
        <div className="px-2.5 py-2 flex-shrink-0 space-y-1"
          style={{ borderBottom: '1px solid #2a3347' }}>
          <div className="flex items-center justify-between">
            <button onClick={() => { setView('books'); setSelectedBook(null) }}
              className="flex items-center gap-1 text-[11px] font-medium transition-colors hover:text-blue-300"
              style={{ color: '#3b82f6' }}>
              ← Kitab
            </button>
            {versionPills}
          </div>
          <p className="text-sm font-semibold truncate" style={{ color: '#f1f5f9' }}>
            {selectedBook.name}
          </p>
          <p className="text-[10px]" style={{ color: '#374151' }}>
            {count} pasal — pilih pasal untuk lihat ayat
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(34px, 1fr))' }}>
            {Array.from({ length: count }, (_, i) => i + 1).map(ch => (
              <ChapterButton key={ch} chapter={ch}
                onClick={() => { setSelectedChapter(ch); setView('verses') }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ══════════════ VERSES VIEW ══════════════
  if (view === 'verses' && selectedBook && selectedChapter !== null) {
    const displayName = bookName || selectedBook.name
    const displayAbbr = bookAbbr || selectedBook.nameAbbr
    return (
      <div className="flex flex-col h-full">
        <div className="px-2.5 py-2 flex-shrink-0 space-y-1"
          style={{ borderBottom: '1px solid #2a3347' }}>
          <div className="flex items-center justify-between">
            <button onClick={() => setView('chapters')}
              className="flex items-center gap-1 text-[11px] font-medium transition-colors hover:text-blue-300"
              style={{ color: '#3b82f6' }}>
              ← {displayName}
            </button>
            {versionPills}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
              {displayName} {selectedChapter}
              {totalChapters > 0 && (
                <span className="text-[10px] font-normal ml-1" style={{ color: '#374151' }}>
                  / {totalChapters}
                </span>
              )}
            </p>
            {verses.length > 0 && (
              <button onClick={addChapter}
                className="text-[10px] px-2 py-0.5 rounded flex-shrink-0 transition-all"
                style={{ background: '#14532d', color: '#86efac', border: '1px solid #166534' }}>
                + Tambah Pasal
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="text-center py-4 text-[10px]" style={{ color: '#475569' }}>Memuat ayat...</div>
          )}
          {!loading && verses.length === 0 && (
            <div className="text-center py-4 text-[10px]" style={{ color: '#475569' }}>
              Ayat tidak ditemukan
            </div>
          )}
          {!loading && verses.map(v => (
            <VerseRow
              key={v.id}
              verse={v}
              onLive={() => onQuickLaunch(
                v.text,
                `${displayAbbr} ${selectedChapter}:${v.verseNumber}`
              )}
              onAdd={() => addVerse(v)}
            />
          ))}
        </div>
      </div>
    )
  }

  return null
}

// ── Sub-components ─────────────────────────────────────────

function BookRow({ book, onSelect }: { book: BookInfo; onSelect: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer transition-colors"
      style={{ background: hover ? '#1e2535' : 'transparent' }}
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-[10px] flex-shrink-0" style={{ color: '#475569', minWidth: 28 }}>
          {book.nameAbbr}
        </span>
        <span className="text-xs truncate" style={{ color: hover ? '#f1f5f9' : '#94a3b8' }}>{book.name}</span>
      </div>
      <span className="text-[9px] flex-shrink-0 ml-1" style={{ color: '#374151' }}>
        {book.totalChapters}
      </span>
    </div>
  )
}

function ChapterButton({ chapter, onClick }: { chapter: number; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="py-1.5 rounded text-xs font-medium transition-all"
      style={{
        background: hover ? '#1d4ed8' : '#1e2535',
        color:      hover ? '#fff'    : '#94a3b8',
        border:     '1px solid #2a3347',
      }}
    >
      {chapter}
    </button>
  )
}

function VerseRow({ verse, onLive, onAdd }: {
  verse: VerseData; onLive: () => void; onAdd: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      className="flex gap-2 px-2.5 py-2 transition-colors"
      style={{
        background:  hover ? '#0d1520' : 'transparent',
        borderBottom: '1px solid #1a2235',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="text-[10px] font-mono flex-shrink-0 mt-0.5"
        style={{ color: '#374151', minWidth: 18, textAlign: 'right' }}>
        {verse.verseNumber}
      </span>
      <span className="text-xs flex-1 leading-relaxed" style={{ color: '#94a3b8' }}>
        {verse.text}
      </span>
      {/* Action buttons — visible on hover */}
      <div className="flex flex-col gap-1 flex-shrink-0 transition-opacity"
        style={{ opacity: hover ? 1 : 0 }}>
        <button onClick={onLive}
          className="text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap"
          style={{ background: '#581c87', color: '#e9d5ff', border: '1px solid #7e22ce' }}>
          ▶ Live
        </button>
        <button onClick={onAdd}
          className="text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap"
          style={{ background: '#1e3a5f', color: '#93c5fd', border: '1px solid #1d4ed8' }}>
          + Ibadah
        </button>
      </div>
    </div>
  )
}
