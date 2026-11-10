'use client'

import { useState } from 'react'

const SAMPLE_SONGS = [
  { id: '1', title: 'Amazing Grace',          artist: 'John Newton' },
  { id: '2', title: 'Besar Kuasa-Mu',          artist: 'Paul Baloche' },
  { id: '3', title: 'Great is Thy Faithfulness',artist: 'Thomas Chisholm' },
  { id: '4', title: 'Hanya Dekat Allah',        artist: 'Nada Sorga' },
  { id: '5', title: 'Here I Am to Worship',     artist: 'Tim Hughes' },
  { id: '6', title: 'Indah Rencanamu',          artist: 'True Worshippers' },
  { id: '7', title: 'Jesus Loves Me',           artist: 'Anna Warner' },
  { id: '8', title: 'Kuingin Melihat Wajah-Mu', artist: 'GMS Church' },
  { id: '9', title: 'Lihatlah Betapa Besar',    artist: 'GMS Church' },
  { id: '10', title: 'Maju Terus Pantang Mundur',artist: 'Victor Hutabarat' },
]

interface Props { onAdd: (song: typeof SAMPLE_SONGS[0]) => void }

export function SongLibrary({ onAdd }: Props) {
  const [q, setQ] = useState('')
  const filtered = SAMPLE_SONGS.filter(s =>
    !q || s.title.toLowerCase().includes(q.toLowerCase()) || s.artist.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 flex-shrink-0">
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{ background: '#1e2535', border: '1px solid #2a3347' }}
        >
          <svg className="w-3 h-3 flex-shrink-0" style={{ color: '#475569' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari lagu..."
            className="bg-transparent text-xs focus:outline-none w-full"
            style={{ color: '#e2e8f0' }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-1.5 pb-2 space-y-0.5">
        {filtered.map(song => (
          <div
            key={song.id}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg group cursor-pointer"
            style={{ background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e2535')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div className="flex-1 min-w-0 mr-2">
              <div className="text-xs font-medium truncate" style={{ color: '#cbd5e1' }}>{song.title}</div>
              <div className="text-[10px] truncate" style={{ color: '#475569' }}>{song.artist}</div>
            </div>
            <button
              onClick={() => onAdd(song)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-2 py-0.5 rounded"
              style={{ background: '#1d4ed8', color: 'white' }}
            >
              + Tambah
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
