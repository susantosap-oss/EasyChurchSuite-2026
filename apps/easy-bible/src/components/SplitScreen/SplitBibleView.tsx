'use client'

import { useState, useCallback } from 'react'
import { VersePane } from './VersePane'
import type { TextDirection } from '@easychurch/scripture'

export interface VerseRef {
  bookCode: string
  bookName: string
  bookAbbr: string
  bookNumber: number
  chapter: number
  verse: number
  verseId: number
  text: string
  versionCode: string
}

interface PaneState {
  id: 'left' | 'right'
  versionCode: string
  direction: TextDirection
  bookNumber: number
  chapterNumber: number
  currentRef: VerseRef | null
}

const DEFAULT_BOOK    = 43 // Yohanes
const DEFAULT_CHAPTER = 3

export function SplitBibleView() {
  const [isSplit, setIsSplit] = useState(false)
  const [syncNav, setSyncNav] = useState(true)

  const [leftPane, setLeftPane] = useState<PaneState>({
    id: 'left', versionCode: 'TB', direction: 'ltr',
    bookNumber: DEFAULT_BOOK, chapterNumber: DEFAULT_CHAPTER, currentRef: null,
  })

  const [rightPane, setRightPane] = useState<PaneState>({
    id: 'right', versionCode: 'AYT', direction: 'ltr',
    bookNumber: DEFAULT_BOOK, chapterNumber: DEFAULT_CHAPTER, currentRef: null,
  })

  const handleVerseSelect = useCallback((paneId: 'left' | 'right', ref: VerseRef) => {
    if (paneId === 'left') setLeftPane(p => ({ ...p, currentRef: ref }))
    else                   setRightPane(p => ({ ...p, currentRef: ref }))
  }, [])

  const handleVersionChange = useCallback((paneId: 'left' | 'right', version: string) => {
    if (paneId === 'left') setLeftPane(p => ({ ...p, versionCode: version }))
    else                   setRightPane(p => ({ ...p, versionCode: version }))
  }, [])

  const handleNavigate = useCallback((paneId: 'left' | 'right', bookNum: number, chapNum: number) => {
    if (paneId === 'left') {
      setLeftPane(p => ({ ...p, bookNumber: bookNum, chapterNumber: chapNum, currentRef: null }))
      if (syncNav && isSplit) setRightPane(p => ({ ...p, bookNumber: bookNum, chapterNumber: chapNum, currentRef: null }))
    } else {
      setRightPane(p => ({ ...p, bookNumber: bookNum, chapterNumber: chapNum, currentRef: null }))
      if (syncNav && isSplit) setLeftPane(p => ({ ...p, bookNumber: bookNum, chapterNumber: chapNum, currentRef: null }))
    }
  }, [syncNav, isSplit])

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900 flex-shrink-0">
        <button
          onClick={() => setIsSplit(v => !v)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            isSplit ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {isSplit ? 'Split ON' : 'Split'}
        </button>

        {isSplit && (
          <button
            onClick={() => setSyncNav(v => !v)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              syncNav ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {syncNav ? 'Sync ON' : 'Sync OFF'}
          </button>
        )}

        <div className="flex-1" />

        {isSplit && (
          <button
            onClick={() => setRightPane(p => ({
              ...p, direction: p.direction === 'ltr' ? 'rtl' : 'ltr',
            }))}
            className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
            title="Toggle arah teks kanan"
          >
            {rightPane.direction === 'rtl' ? '← RTL' : 'LTR →'}
          </button>
        )}
      </div>

      {/* Panes */}
      <div className="flex-1 flex overflow-hidden">
        <VersePane
          paneId="left"
          versionCode={leftPane.versionCode}
          direction={leftPane.direction}
          currentRef={leftPane.currentRef}
          bookNumber={leftPane.bookNumber}
          chapterNumber={leftPane.chapterNumber}
          onVerseSelect={ref => handleVerseSelect('left', ref)}
          onVersionChange={v => handleVersionChange('left', v)}
          onNavigate={(b, c) => handleNavigate('left', b, c)}
          className={isSplit ? 'w-1/2 border-r border-slate-800' : 'w-full'}
        />

        {isSplit && (
          <VersePane
            paneId="right"
            versionCode={rightPane.versionCode}
            direction={rightPane.direction}
            currentRef={rightPane.currentRef}
            bookNumber={rightPane.bookNumber}
            chapterNumber={rightPane.chapterNumber}
            onVerseSelect={ref => handleVerseSelect('right', ref)}
            onVersionChange={v => handleVersionChange('right', v)}
            onNavigate={(b, c) => handleNavigate('right', b, c)}
            className="w-1/2"
          />
        )}
      </div>
    </div>
  )
}
