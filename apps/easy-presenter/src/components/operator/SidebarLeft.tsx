'use client'

import { useState } from 'react'

type Tab = 'playlist' | 'songs' | 'scripture' | 'media'

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function SidebarLeft({ collapsed, onToggle }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('playlist')

  if (collapsed) {
    return (
      <div className="w-12 flex-shrink-0 border-r border-surface-light bg-surface-mid flex flex-col items-center py-2 gap-3">
        <button onClick={onToggle} className="p-2 rounded hover:bg-surface-light text-slate-400 hover:text-white transition-colors" title="Expand sidebar">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'playlist', label: 'Playlist', icon: '📋' },
    { id: 'songs',    label: 'Lagu',     icon: '🎵' },
    { id: 'scripture',label: 'Alkitab',  icon: '📖' },
    { id: 'media',    label: 'Media',    icon: '🖼️' },
  ]

  return (
    <div className="w-72 flex-shrink-0 border-r border-surface-light bg-surface-mid flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-surface-light">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.icon}
          </button>
        ))}
        <button onClick={onToggle} className="px-2 text-slate-500 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'playlist' && <PlaylistPanel />}
        {activeTab === 'songs' && <SongsPanel />}
        {activeTab === 'scripture' && <ScripturePanel />}
        {activeTab === 'media' && <MediaPanel />}
      </div>
    </div>
  )
}

function PlaylistPanel() {
  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-500 uppercase tracking-wider px-2 py-1">Ibadah Minggu</div>
      {['Lagu Pujian 1', 'Lagu Pujian 2', 'Firman Tuhan - Yoh 3:16', 'Lagu Respons', 'Pengumuman'].map((item, i) => (
        <div key={i} className="px-2 py-1.5 rounded cursor-pointer hover:bg-surface-light text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-2">
          <span className="text-slate-500 text-xs w-4">{i + 1}</span>
          {item}
        </div>
      ))}
    </div>
  )
}

function SongsPanel() {
  return (
    <div>
      <input
        type="search"
        placeholder="Cari lagu..."
        className="w-full px-3 py-1.5 bg-surface-dark border border-surface-light rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 mb-2"
      />
      <div className="text-xs text-slate-500 text-center py-4">Belum ada lagu tersimpan</div>
    </div>
  )
}

function ScripturePanel() {
  return (
    <div>
      <input
        type="search"
        placeholder="Cari ayat... (mis: Yoh 3:16)"
        className="w-full px-3 py-1.5 bg-surface-dark border border-surface-light rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 mb-2"
      />
      <div className="text-xs text-slate-500 text-center py-4">Ketik referensi ayat</div>
    </div>
  )
}

function MediaPanel() {
  return <div className="text-xs text-slate-500 text-center py-4">Drag & drop media di sini</div>
}
