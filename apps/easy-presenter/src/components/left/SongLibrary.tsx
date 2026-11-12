'use client'

import { useState, useEffect } from 'react'
import type { ServiceItem } from '../types'
import { DEFAULT_SONG_BG, DEFAULT_TEXT_STYLE } from '../types'
import { AddSongModal } from './AddSongModal'
import { ImportSongsModal } from './ImportSongsModal'

interface DbSong {
  id: number
  title: string
  artist: string
  slides: Array<{ id: number; slide_order: number; label: string; lyrics: string }>
}

interface Props {
  onAdd: (item: ServiceItem) => void
}

export function SongLibrary({ onAdd }: Props) {
  const [q, setQ]               = useState('')
  const [songs, setSongs]       = useState<DbSong[]>([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [confirmId, setConfirmId]   = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchSongs = async () => {
    try {
      const res = await fetch('/api/songs/')
      const data = await res.json() as { songs?: DbSong[] }
      setSongs(data.songs ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchSongs() }, [])

  const filtered = songs.filter(s =>
    !q || s.title.toLowerCase().includes(q.toLowerCase()) ||
    s.artist.toLowerCase().includes(q.toLowerCase())
  )

  const addToService = (song: DbSong) => {
    const item: ServiceItem = {
      id: `song_${song.id}_${Date.now()}`,
      type: 'song',
      title: song.title,
      subtitle: song.artist || '',
      slides: song.slides.map(s => ({
        id: `song_${song.id}_s${s.slide_order}`,
        label: s.label || `Slide ${s.slide_order}`,
        text: s.lyrics,
      })),
      background: { ...DEFAULT_SONG_BG },
      textStyle: { ...DEFAULT_TEXT_STYLE },
    }
    onAdd(item)
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/songs/${id}/`, { method: 'DELETE' })
      if (res.ok) {
        setSongs(prev => prev.filter(s => s.id !== id))
        setConfirmId(null)
      }
    } catch { /* ignore */ }
    finally { setDeletingId(null) }
  }

  const handleAdded = (item: ServiceItem) => {
    setSongs(prev => [...prev, {
      id: parseInt(item.id.split('_')[1] ?? '0'),
      title: item.title,
      artist: item.subtitle,
      slides: item.slides.map((s, i) => ({
        id: i,
        slide_order: i + 1,
        label: s.label,
        lyrics: s.text,
      })),
    }])
    onAdd(item)
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Search + Add button */}
        <div className="p-2 flex-shrink-0 space-y-1.5">
          <div className="flex gap-1.5">
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg flex-1"
              style={{ background: '#1e2535', border: '1px solid #2a3347' }}
            >
              <svg className="w-3 h-3 flex-shrink-0" style={{ color: '#475569' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Cari lagu..."
                className="bg-transparent text-xs focus:outline-none w-full"
                style={{ color: '#e2e8f0' }}
              />
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="px-2 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
              style={{ background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3347' }}
              title="Import database lagu"
            >
              ⬆
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex-shrink-0"
              style={{ background: '#1d4ed8', color: 'white' }}
              title="Tambah lagu baru"
            >
              +
            </button>
          </div>
        </div>

        {/* Song list */}
        <div className="flex-1 overflow-y-auto px-1.5 pb-2 space-y-0.5">
          {loading && (
            <div className="text-center py-6 text-[10px]" style={{ color: '#475569' }}>Memuat lagu...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-6 space-y-2">
              <p className="text-[10px]" style={{ color: '#475569' }}>
                {songs.length === 0 ? 'Belum ada lagu' : 'Tidak ada lagu yang cocok'}
              </p>
              {songs.length === 0 && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: '#1d4ed8', color: 'white' }}
                >
                  + Tambah Lagu Pertama
                </button>
              )}
            </div>
          )}
          {!loading && filtered.map(song => (
            <div key={song.id}>
              {/* Normal row */}
              {confirmId !== song.id ? (
                <div
                  className="flex items-center px-2.5 py-1.5 rounded-lg group"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1e2535')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex-1 min-w-0 mr-2 cursor-pointer" onClick={() => addToService(song)}>
                    <div className="text-xs font-medium truncate" style={{ color: '#cbd5e1' }}>{song.title}</div>
                    <div className="text-[10px] truncate" style={{ color: '#475569' }}>
                      {song.artist || 'No artist'} · {song.slides.length} bagian
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => addToService(song)}
                      className="text-[9px] px-2 py-0.5 rounded"
                      style={{ background: '#1d4ed8', color: 'white' }}
                    >
                      + Ibadah
                    </button>
                    <button
                      onClick={() => setConfirmId(song.id)}
                      className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: '#3b1515', color: '#fca5a5' }}
                      title="Hapus lagu"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ) : (
                /* Confirm delete row */
                <div
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                  style={{ background: '#1f1515', border: '1px solid #3b1515' }}
                >
                  <span className="text-[10px] flex-1" style={{ color: '#fca5a5' }}>
                    Hapus &quot;{song.title}&quot;?
                  </span>
                  <button
                    onClick={() => handleDelete(song.id)}
                    disabled={deletingId === song.id}
                    className="text-[9px] px-2 py-1 rounded font-semibold"
                    style={{ background: '#dc2626', color: 'white', opacity: deletingId === song.id ? 0.6 : 1 }}
                  >
                    {deletingId === song.id ? '...' : 'Hapus'}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-[9px] px-2 py-1 rounded"
                    style={{ background: '#1e2535', color: '#94a3b8' }}
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showAdd && (
        <AddSongModal
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
        />
      )}

      {showImport && (
        <ImportSongsModal
          onClose={() => setShowImport(false)}
          onImported={fetchSongs}
        />
      )}
    </>
  )
}
