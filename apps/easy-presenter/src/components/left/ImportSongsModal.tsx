'use client'

import { useRef, useState } from 'react'

interface Props {
  onClose: () => void
  onImported: () => void
}

const FORMAT_EXAMPLE = `{
  "songs": [
    {
      "title": "Amazing Grace",
      "artist": "John Newton",
      "slides": [
        { "label": "Verse 1", "lyrics": "Amazing grace how sweet the sound\\nThat saved a wretch like me" },
        { "label": "Chorus",  "lyrics": "My chains are gone, I've been set free" }
      ]
    }
  ]
}`

export function ImportSongsModal({ onClose, onImported }: Props) {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [files, setFiles]     = useState<File[]>([])
  const [status, setStatus]   = useState<'idle' | 'importing' | 'done' | 'error'>('idle')
  const [result, setResult]   = useState<{ imported?: number; skipped?: number; total?: number } | null>(null)
  const [error, setError]     = useState('')
  const [showFormat, setShowFormat] = useState(false)

  const pickFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []).filter(f => /\.(db|json)$/i.test(f.name))
    if (picked.length) { setFiles(picked); setError(''); setStatus('idle'); setResult(null) }
  }

  const names     = files.map(f => f.name.toLowerCase())
  const ewSongs   = names.includes('songs.db')
  const ewWords   = names.includes('songwords.db')
  const ewMissing = ewSongs !== ewWords
    ? (ewSongs ? 'SongWords.db' : 'Songs.db')
    : null

  const handleImport = async () => {
    if (!files.length) { setError('Pilih file terlebih dahulu'); return }
    setStatus('importing')
    setError('')
    try {
      const form = new FormData()
      files.forEach(f => form.append('file', f))
      const res  = await fetch('/api/songs/import-db/', { method: 'POST', body: form })
      const json = await res.json() as {
        success?: boolean; imported?: number; skipped?: number; total?: number; error?: string
      }
      if (!res.ok || json.error) throw new Error(json.error ?? 'Gagal import')
      setResult({ imported: json.imported, skipped: json.skipped, total: json.total })
      setStatus('done')
      onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      setStatus('error')
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
        style={{ width: 500, maxHeight: '90vh', background: '#161b27', border: '1px solid #2a3347' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: '1px solid #2a3347', background: '#1a2235' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>Import Database Lagu</h2>
            <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>
              Import lagu dari EasyWorship 6/7, OpenLP, ProPresenter (.db) atau JSON
            </p>
          </div>
          <button onClick={onClose} className="text-lg leading-none" style={{ color: '#475569' }}>×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Format toggle */}
          <div>
            <button
              onClick={() => setShowFormat(v => !v)}
              className="flex items-center gap-2 text-xs font-medium"
              style={{ color: '#3b82f6' }}
            >
              {showFormat ? '▼' : '►'} Lihat format JSON yang dibutuhkan
            </button>
            {showFormat && (
              <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a5f' }}>
                <div className="px-3 py-1.5 text-[10px] font-bold" style={{ background: '#0d1520', color: '#3b82f6' }}>
                  format.json — struktur songs
                </div>
                <pre
                  className="p-3 text-[10px] overflow-x-auto leading-relaxed"
                  style={{ background: '#0a0f1a', color: '#94a3b8', fontFamily: 'monospace' }}
                >
                  {FORMAT_EXAMPLE}
                </pre>
              </div>
            )}
          </div>

          {/* EasyWorship guide */}
          <div className="px-3 py-2.5 rounded-xl space-y-1" style={{ background: '#0d1520', border: '1px solid #1e3a5f' }}>
            <p className="text-[11px] font-semibold" style={{ color: '#ffffff' }}>EasyWorship 6 / 7</p>
            <p className="text-[10px]" style={{ color: '#94a3b8' }}>
              Pilih <b style={{ color: '#fbbf24' }}>Songs.db</b> dan <b style={{ color: '#fbbf24' }}>SongWords.db</b> sekaligus
              (Ctrl+klik). Biasanya ada di:
            </p>
            <code className="block text-[9px] px-2 py-1 rounded break-all" style={{ background: '#0a0f1a', color: '#93c5fd' }}>
              {'C:\\Users\\Public\\Documents\\Softouch\\EasyWorship\\Default\\…\\Databases\\Data'}
            </code>
            <p className="text-[10px]" style={{ color: '#94a3b8' }}>
              Label Verse / Chorus / Bridge ikut terbawa sebagai grup slide. Tutup EasyWorship dulu sebelum menyalin file.
            </p>
          </div>

          {/* Source info */}
          <div className="text-[10px] space-y-1" style={{ color: '#475569' }}>
            <p>
              <span style={{ color: '#f1f5f9' }}>.db (SQLite)</span>
              {' '}— terdeteksi otomatis: EasyWorship 6/7, OpenLP, ProPresenter 6
            </p>
            <p>
              <span style={{ color: '#f1f5f9' }}>.json</span>
              {' '}— format standar EasyPresenter (lihat contoh di atas)
            </p>
            <p style={{ color: '#374151' }}>Lagu dengan judul yang sama dilewati (tidak duplikat)</p>
          </div>

          {/* File picker */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
              File Database Lagu
            </label>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
              style={{ border: '2px dashed #2a3347', background: '#0f1117' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); pickFiles(e.dataTransfer.files) }}
            >
              <div className="text-2xl">{files.length ? '🎵' : '📂'}</div>
              <div className="flex-1 min-w-0">
                {files.length ? (
                  <>
                    {files.map(f => (
                      <p key={f.name} className="text-sm font-medium truncate" style={{ color: '#f1f5f9' }}>
                        {f.name} <span className="text-[10px] font-normal" style={{ color: '#94a3b8' }}>
                          · {(f.size / 1024).toFixed(0)} KB
                        </span>
                      </p>
                    ))}
                    <p className="text-[10px]" style={{ color: '#94a3b8' }}>klik / drop untuk ganti</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>Klik atau drop file di sini</p>
                    <p className="text-[10px]" style={{ color: '#64748b' }}>Format: .db · .json — boleh beberapa file</p>
                  </>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".db,.json" multiple className="hidden"
              onChange={e => { pickFiles(e.target.files); if (fileRef.current) fileRef.current.value = '' }} />
            {ewMissing && (
              <p className="text-[10px] mt-1.5" style={{ color: '#fbbf24' }}>
                ⚠ File EasyWorship belum lengkap — tambahkan juga <b>{ewMissing}</b> (pilih kedua file sekaligus)
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2.5 rounded-xl text-xs" style={{ background: '#3b1515', color: '#fca5a5' }}>
              ❌ {error}
            </div>
          )}

          {/* Success */}
          {status === 'done' && result && (
            <div className="px-4 py-3 rounded-xl space-y-1" style={{ background: '#14532d', border: '1px solid #166534' }}>
              <p className="text-sm font-bold" style={{ color: '#86efac' }}>✓ Import Berhasil!</p>
              <p className="text-xs" style={{ color: '#86efac' }}>
                <strong>{result.imported}</strong> lagu diimport
                {(result.skipped ?? 0) > 0 && <> · <strong>{result.skipped}</strong> dilewati (duplikat)</>}
                {' '}dari total {result.total} lagu
              </p>
              <p className="text-[10px]" style={{ color: '#4ade80' }}>
                Daftar lagu telah diperbarui secara otomatis
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 flex-shrink-0"
          style={{ borderTop: '1px solid #2a3347' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3347' }}
          >
            Tutup
          </button>
          {status !== 'done' && (
            <button
              onClick={handleImport}
              disabled={!files.length || status === 'importing'}
              className="px-5 py-2 rounded-lg text-sm font-semibold"
              style={{
                background: !files.length ? '#1e2535' : '#1d4ed8',
                color:      !files.length ? '#475569' : 'white',
                cursor:     !files.length ? 'not-allowed' : 'pointer',
                opacity:    status === 'importing' ? 0.7 : 1,
              }}
            >
              {status === 'importing' ? 'Mengimport...' : '⬆ Import Sekarang'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
