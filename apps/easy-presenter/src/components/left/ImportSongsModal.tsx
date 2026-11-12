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
  const [file, setFile]       = useState<File | null>(null)
  const [status, setStatus]   = useState<'idle' | 'importing' | 'done' | 'error'>('idle')
  const [result, setResult]   = useState<{ imported?: number; skipped?: number; total?: number } | null>(null)
  const [error, setError]     = useState('')
  const [showFormat, setShowFormat] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setError(''); setStatus('idle'); setResult(null) }
  }

  const handleImport = async () => {
    if (!file) { setError('Pilih file terlebih dahulu'); return }
    setStatus('importing')
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
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
              Import lagu dari OpenLP, EasyWorship, ProPresenter (.db) atau JSON
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

          {/* Source info */}
          <div className="text-[10px] space-y-1" style={{ color: '#475569' }}>
            <p>
              <span style={{ color: '#f1f5f9' }}>.db (SQLite)</span>
              {' '}— terdeteksi otomatis: OpenLP, EasyWorship 6/7, ProPresenter 6
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
            >
              <div className="text-2xl">{file ? '🎵' : '📂'}</div>
              <div className="flex-1">
                {file ? (
                  <>
                    <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{file.name}</p>
                    <p className="text-[10px]" style={{ color: '#475569' }}>
                      {(file.size / 1024).toFixed(0)} KB · klik untuk ganti
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium" style={{ color: '#64748b' }}>Klik untuk pilih file</p>
                    <p className="text-[10px]" style={{ color: '#374151' }}>Format: .db · .json</p>
                  </>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".db,.json" className="hidden" onChange={handleFileChange} />
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
              disabled={!file || status === 'importing'}
              className="px-5 py-2 rounded-lg text-sm font-semibold"
              style={{
                background: !file ? '#1e2535' : '#1d4ed8',
                color:      !file ? '#475569' : 'white',
                cursor:     !file ? 'not-allowed' : 'pointer',
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
