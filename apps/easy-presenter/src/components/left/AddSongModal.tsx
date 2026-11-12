'use client'

import { useState } from 'react'
import type { ServiceItem } from '../types'
import { DEFAULT_SONG_BG, DEFAULT_TEXT_STYLE } from '../types'

interface Props {
  onClose: () => void
  onAdded: (item: ServiceItem) => void
}

function parseLyrics(text: string): Array<{ label: string; lyrics: string }> {
  const LABEL_RE = /^\[(.+)\]$|^(verse|chorus|bridge|reff|pre[-\s]?chorus|intro|outro|interlude|coda|stanza)\s*\d*$/i

  const blocks = text.split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean)

  return blocks.map((block, i) => {
    const lines = block.split('\n')
    const firstLine = lines[0]?.trim() ?? ''
    const labelMatch = firstLine.match(LABEL_RE)

    if (labelMatch) {
      const label = labelMatch[1] ?? firstLine
      const lyrics = lines.slice(1).join('\n').trim()
      return { label: label.trim(), lyrics }
    }
    return { label: `Slide ${i + 1}`, lyrics: block }
  })
}

export function AddSongModal({ onClose, onAdded }: Props) {
  const [title, setTitle]   = useState('')
  const [artist, setArtist] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSave = async () => {
    setError('')
    if (!title.trim()) { setError('Judul lagu wajib diisi'); return }
    if (!lyrics.trim()) { setError('Lirik wajib diisi'); return }

    const slides = parseLyrics(lyrics)
    if (!slides.length) { setError('Lirik kosong setelah diparse'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/songs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), artist: artist.trim(), slides }),
      })
      const data = await res.json() as { id?: number; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Gagal menyimpan')

      const newItem: ServiceItem = {
        id: `song_${data.id}`,
        type: 'song',
        title: title.trim(),
        subtitle: artist.trim(),
        slides: slides.map((s, i) => ({
          id: `song_${data.id}_s${i + 1}`,
          label: s.label,
          text: s.lyrics,
        })),
        background: { ...DEFAULT_SONG_BG },
        textStyle: { ...DEFAULT_TEXT_STYLE },
      }
      onAdded(newItem)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{ width: 560, maxHeight: '90vh', background: '#161b27', border: '1px solid #2a3347' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: '1px solid #2a3347', background: '#1a2235' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>+ Tambah Lagu</h2>
            <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>
              Ketik atau tempel lirik — pisahkan bagian (verse/chorus) dengan baris kosong
            </p>
          </div>
          <button onClick={onClose} className="text-lg leading-none" style={{ color: '#475569' }}>×</button>
        </div>

        {/* Fields */}
        <div className="flex gap-3 px-5 pt-4 pb-2 flex-shrink-0">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>
              Judul Lagu *
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nama lagu..."
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: '#0f1117', border: '1px solid #2a3347', color: '#f1f5f9' }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>
              Artis / Pencipta
            </label>
            <input
              value={artist}
              onChange={e => setArtist(e.target.value)}
              placeholder="Nama artis..."
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: '#0f1117', border: '1px solid #2a3347', color: '#f1f5f9' }}
            />
          </div>
        </div>

        {/* Format hint */}
        <div className="mx-5 mb-2 px-3 py-2 rounded-lg flex-shrink-0"
          style={{ background: '#0d1520', border: '1px solid #1e3a5f' }}>
          <p className="text-[10px]" style={{ color: '#3b82f6' }}>
            Format: tulis label bagian seperti <code className="text-yellow-400">[Verse 1]</code> atau{' '}
            <code className="text-yellow-400">[Chorus]</code> di baris pertama tiap bagian, lalu liriknya.
            Pisahkan antar bagian dengan 1 baris kosong.
          </p>
        </div>

        {/* Lyrics textarea */}
        <div className="px-5 pb-2 flex-1 flex flex-col min-h-0">
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>
            Lirik Lagu *
          </label>
          <textarea
            value={lyrics}
            onChange={e => setLyrics(e.target.value)}
            placeholder={`[Verse 1]\nBesar kuasa-Mu ya Tuhan\nTiada yang seperti Engkau\n\n[Chorus]\nKau Tuhan yang menyelamatkan\nKau Tuhan yang memulihkan`}
            className="flex-1 w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none resize-none"
            style={{
              background: '#0f1117',
              border: '1px solid #2a3347',
              color: '#f1f5f9',
              fontFamily: 'monospace',
              minHeight: 220,
            }}
          />
          {lyrics && (
            <p className="text-[10px] mt-1" style={{ color: '#475569' }}>
              {parseLyrics(lyrics).length} bagian terdeteksi
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#3b1515', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 flex-shrink-0"
          style={{ borderTop: '1px solid #2a3347' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3347' }}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: saving ? '#1e3a5f' : '#1d4ed8',
              color: 'white',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Menyimpan...' : '✓ Simpan Lagu'}
          </button>
        </div>
      </div>
    </div>
  )
}
