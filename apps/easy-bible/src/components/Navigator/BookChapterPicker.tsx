'use client'

import { useState, useEffect } from 'react'
import { BibleClient } from '@/lib/bible-client'
import type { BookInfo } from '@easychurch/bible-queries'

interface Props {
  version: string
  currentBook: number
  currentChapter: number
  onSelect: (bookNumber: number, chapterNumber: number) => void
  onClose: () => void
}

export function BookChapterPicker({ version, currentBook, currentChapter, onSelect, onClose }: Props) {
  const [books, setBooks] = useState<BookInfo[]>([])
  const [selectedBook, setSelectedBook] = useState<BookInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    BibleClient.getBooks(version)
      .then(res => {
        setBooks(res.books)
        const cur = res.books.find(b => b.number === currentBook) ?? res.books[0] ?? null
        setSelectedBook(cur)
      })
      .finally(() => setLoading(false))
  }, [version, currentBook])

  const ot = books.filter(b => b.testament === 'OT')
  const nt = books.filter(b => b.testament === 'NT')

  const handleChapterClick = (chapNum: number) => {
    if (!selectedBook) return
    onSelect(selectedBook.number, chapNum)
    onClose()
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:w-[480px] bg-slate-900 rounded-t-2xl sm:rounded-2xl overflow-hidden border border-slate-700 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <span className="font-semibold text-white">Pilih Kitab & Pasal</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">✕</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-slate-500 text-sm">Memuat daftar kitab...</div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Book list */}
            <div className="w-48 flex-shrink-0 border-r border-slate-700 overflow-y-auto py-2">
              {[{ label: 'Perjanjian Lama', items: ot }, { label: 'Perjanjian Baru', items: nt }].map(group => (
                <div key={group.label}>
                  <div className="px-3 py-1 text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                    {group.label}
                  </div>
                  {group.items.map(book => (
                    <button
                      key={book.number}
                      onClick={() => setSelectedBook(book)}
                      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                        selectedBook?.number === book.number
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {book.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Chapter grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {selectedBook ? (
                <>
                  <div className="text-xs text-slate-500 mb-3 font-medium">{selectedBook.name}</div>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: selectedBook.totalChapters }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        onClick={() => handleChapterClick(n)}
                        className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                          selectedBook.number === currentBook && n === currentChapter
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-slate-600 text-sm text-center py-8">Pilih kitab</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
