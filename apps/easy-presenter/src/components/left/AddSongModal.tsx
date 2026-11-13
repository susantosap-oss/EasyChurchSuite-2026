'use client'

import { useMemo, useRef, useState } from 'react'
import type { ServiceItem } from '../types'
import { DEFAULT_SONG_BG, DEFAULT_TEXT_STYLE } from '../types'
import { SlideCanvas } from '../shared/SlideCanvas'
import { parseLyrics } from '@/lib/lyrics'

interface Props {
  onClose: () => void
  onAdded: (item: ServiceItem) => void
}

// ProPresenter-style group colors
const GROUP_COLORS: Array<[RegExp, string]> = [
  [/pre[-\s]?chorus/i,             '#f59e0b'],
  [/chorus|reff?/i,                '#ef4444'],
  [/verse|bait|stanza/i,           '#3b82f6'],
  [/bridge/i,                      '#a855f7'],
  [/tag|ending|outro|coda/i,       '#22c55e'],
  [/intro|interlude/i,             '#64748b'],
]

export function groupColor(label: string): string {
  return GROUP_COLORS.find(([re]) => re.test(label))?.[1] ?? '#475569'
}

const LINES_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Auto' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
]

const QUICK_LABELS = ['Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Tag', 'Intro', 'Outro']

export function AddSongModal({ onClose, onAdded }: Props) {
  const [title, setTitle]       = useState('')
  const [artist, setArtist]     = useState('')
  const [lyrics, setLyrics]     = useState('')
  const [maxLines, setMaxLines] = useState(0)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [dbFailed, setDbFailed] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const slides = useMemo(() => parseLyrics(lyrics, maxLines), [lyrics, maxLines])
  const groupCount = useMemo(
    () => slides.filter((s, i) => i === 0 || slides[i - 1]!.label !== s.label).length,
    [slides],
  )

  // Insert "[Label]" at the cursor, on its own line with a blank line before it
  const insertLabel = (base: string) => {
    const ta = textareaRef.current
    if (!ta) return
    let label = base
    if (base === 'Verse') {
      const n = (lyrics.match(/^\[?verse\s*\d*\]?$/gim) ?? []).length
      label = `Verse ${n + 1}`
    }
    const pos    = ta.selectionStart
    const before = lyrics.slice(0, pos).replace(/\s+$/, '')
    const after  = lyrics.slice(ta.selectionEnd).replace(/^\s+/, '')
    const insert = `${before ? '\n\n' : ''}[${label}]\n`
    const next   = before + insert + after
    setLyrics(next)
    requestAnimationFrame(() => {
      ta.focus()
      const caret = before.length + insert.length
      ta.setSelectionRange(caret, caret)
    })
  }

  const buildItem = (idBase: string, songId?: number): ServiceItem => ({
    id: idBase,
    songId,
    type: 'song',
    title: title.trim(),
    subtitle: artist.trim(),
    slides: slides.map((s, i) => ({ id: `${idBase}_s${i + 1}`, label: s.label, text: s.lyrics })),
    background: { ...DEFAULT_SONG_BG },
    textStyle: { ...DEFAULT_TEXT_STYLE },
  })

  const validate = () => {
    if (!title.trim()) { setError('Judul lagu wajib diisi'); return false }
    if (!slides.length) { setError('Lirik wajib diisi'); return false }
    return true
  }

  const handleSave = async () => {
    setError('')
    setDbFailed(false)
    if (!validate()) return

    setSaving(true)
    try {
      const res = await fetch('/api/songs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), artist: artist.trim(), slides }),
      })
      const data = await res.json() as { id?: number; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Gagal menyimpan')

      onAdded(buildItem(`song_${data.id}`, data.id))
      onClose()
    } catch (err) {
      setError(`Gagal simpan ke database: ${err instanceof Error ? err.message : 'Terjadi kesalahan'}`)
      setDbFailed(true)
    } finally {
      setSaving(false)
    }
  }

  // Fallback when the database is unavailable: add to the service only
  const handleAddWithoutSave = () => {
    if (!validate()) return
    onAdded(buildItem(`song_local_${Date.now()}`))
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
        style={{ width: 'min(1180px, 94vw)', height: '88vh', background: '#161b27', border: '1px solid #2a3347' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #2a3347', background: '#1a2235' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>+ Tambah Lagu</h2>
            <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
              Tempel lirik — baris kosong = slide baru · label [Verse 1] / [Chorus] = grup baru
            </p>
          </div>
          <button onClick={onClose} className="text-lg leading-none" style={{ color: '#94a3b8' }}>×</button>
        </div>

        {/* Title / artist */}
        <div className="flex gap-3 px-5 pt-3 pb-2 flex-shrink-0">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#ffffff' }}>
              Judul Lagu *
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nama lagu..."
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: '#0f1117', border: '1px solid #2a3347', color: '#f1f5f9' }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#ffffff' }}>
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

        {/* Editor (left) + live slide preview (right) */}
        <div className="flex-1 flex gap-3 px-5 pb-2 min-h-0">
          {/* ── Lyrics editor ── */}
          <div className="flex flex-col min-h-0" style={{ width: '40%' }}>
            <div className="flex items-center gap-1 mb-1.5 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wider mr-1" style={{ color: '#ffffff' }}>
                Lirik *
              </span>
              {QUICK_LABELS.map(l => (
                <button
                  key={l}
                  onClick={() => insertLabel(l)}
                  title={`Sisipkan [${l}] di posisi kursor`}
                  className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                  style={{ background: `${groupColor(l)}22`, color: groupColor(l), border: `1px solid ${groupColor(l)}55` }}
                >+ {l}</button>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={lyrics}
              onChange={e => setLyrics(e.target.value)}
              placeholder={`[Verse 1]\nBesar kuasa-Mu ya Tuhan\nTiada yang seperti Engkau\n\nTak ada yang dapat menandingi\nKebesaran nama-Mu\n\n[Chorus]\nKau Tuhan yang menyelamatkan\nKau Tuhan yang memulihkan`}
              spellCheck={false}
              className="flex-1 w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none resize-none"
              style={{
                background: '#0f1117',
                border: '1px solid #2a3347',
                color: '#f1f5f9',
                fontFamily: 'monospace',
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* ── Slide preview ── */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#ffffff' }}>
                Slide
              </span>
              <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                {slides.length} slide · {groupCount} grup
              </span>
              <div className="flex-1" />
              <span className="text-[10px]" style={{ color: '#94a3b8' }}>Maks baris/slide:</span>
              {LINES_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setMaxLines(o.value)}
                  className="text-[10px] px-2 py-0.5 rounded font-mono"
                  style={{
                    background: maxLines === o.value ? '#1d4ed8' : '#1e2535',
                    color:      '#ffffff',
                    border:     `1px solid ${maxLines === o.value ? '#2563eb' : '#2a3347'}`,
                  }}
                >{o.label}</button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto rounded-lg p-2.5 min-h-0"
              style={{ background: '#0f1117', border: '1px solid #2a3347' }}>
              {slides.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center px-6">
                  <p className="text-xs" style={{ color: '#64748b' }}>
                    Slide akan muncul di sini saat Anda mengetik atau menempel lirik
                  </p>
                </div>
              ) : (
                <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
                  {slides.map((s, i) => {
                    const color = groupColor(s.label)
                    return (
                      <div key={i} className="rounded-lg overflow-hidden"
                        style={{ border: '1px solid #2a3347', background: '#161b27' }}>
                        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                          <div className="absolute inset-0">
                            <SlideCanvas text={s.lyrics} background={DEFAULT_SONG_BG}
                              textStyle={DEFAULT_TEXT_STYLE} containerWidth={170} thumbnail />
                          </div>
                          <div className="absolute bottom-1 left-1 text-[9px] font-mono px-1 rounded"
                            style={{ background: 'rgba(0,0,0,0.6)', color: '#cbd5e1', zIndex: 10 }}>{i + 1}</div>
                        </div>
                        {/* Group color bar + label */}
                        <div className="px-2 py-1 text-[10px] font-semibold truncate"
                          style={{ background: color, color: '#ffffff' }}>
                          {s.label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-lg text-xs flex items-center gap-3"
            style={{ background: '#3b1515', color: '#fca5a5' }}>
            <span className="flex-1">{error}</span>
            {dbFailed && (
              <button
                onClick={handleAddWithoutSave}
                className="px-3 py-1 rounded text-[11px] font-semibold flex-shrink-0"
                style={{ background: '#7c2d12', color: '#fed7aa', border: '1px solid #c2410c' }}
              >Tambahkan ke ibadah saja (tanpa simpan)</button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 flex-shrink-0"
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
            {saving ? 'Menyimpan...' : `✓ Simpan Lagu (${slides.length} slide)`}
          </button>
        </div>
      </div>
    </div>
  )
}
