'use client'

import { useRef, useState } from 'react'

interface Props {
  onClose: () => void
}

const FORMAT_EXAMPLE = `{
  "version": {
    "code": "AYT",
    "name": "Alkitab Yang Terbuka",
    "language": "id"
  },
  "books": [
    {
      "number": 43,
      "code": "JHN",
      "name": "Yohanes",
      "name_abbr": "Yoh",
      "testament": "NT",
      "chapters": [
        {
          "number": 1,
          "verses": [
            { "verse": 1, "text": "Pada mulanya adalah Firman..." }
          ]
        }
      ]
    }
  ]
}`

export function ImportBibleModal({ onClose }: Props) {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [file, setFile]       = useState<File | null>(null)
  const [status, setStatus]   = useState<'idle' | 'parsing' | 'importing' | 'done' | 'error'>('idle')
  const [result, setResult]   = useState<{ totalBooks?: number; totalVerses?: number; version?: string } | null>(null)
  const [error, setError]     = useState('')
  const [showFormat, setShowFormat] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setError(''); setStatus('idle'); setResult(null) }
  }

  const handleImport = async () => {
    if (!file) { setError('Pilih file JSON atau EWB terlebih dahulu'); return }

    setStatus('parsing')
    setError('')

    const isEwb = file.name.toLowerCase().endsWith('.ewb')

    try {
      let res: Response

      if (isEwb) {
        const form = new FormData()
        form.append('file', file)
        setStatus('importing')
        res = await fetch('/api/bible/import-ewb', { method: 'POST', body: form })
      } else {
        const text = await file.text()
        const data = JSON.parse(text)
        if (!data.version?.code || !Array.isArray(data.books)) {
          throw new Error('Format file tidak valid. Pastikan ada field "version" dan "books".')
        }
        setStatus('importing')
        res = await fetch('/api/bible/import/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      }

      const json = await res.json() as {
        success?: boolean
        totalBooks?: number
        totalVerses?: number
        version?: string
        error?: string
      }

      if (!res.ok || json.error) throw new Error(json.error ?? 'Gagal import')

      setResult({ totalBooks: json.totalBooks, totalVerses: json.totalVerses, version: json.version })
      setStatus('done')
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
        style={{ width: 540, maxHeight: '90vh', background: '#161b27', border: '1px solid #2a3347' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: '1px solid #2a3347', background: '#1a2235' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>Import Database Alkitab</h2>
            <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>Import terjemahan Alkitab dari file JSON atau EWB</p>
          </div>
          <button onClick={onClose} className="text-lg leading-none" style={{ color: '#475569' }}>×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Format info toggle */}
          <div>
            <button
              onClick={() => setShowFormat(v => !v)}
              className="flex items-center gap-2 text-xs font-medium"
              style={{ color: '#3b82f6' }}
            >
              {showFormat ? '▼' : '►'} Lihat format file JSON yang dibutuhkan
            </button>
            {showFormat && (
              <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a5f' }}>
                <div className="px-3 py-1.5 text-[10px] font-bold" style={{ background: '#0d1520', color: '#3b82f6' }}>
                  format.json — struktur yang diterima
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

          {/* Field info */}
          <div className="text-[10px] space-y-1" style={{ color: '#475569' }}>
            <p><span style={{ color: '#f1f5f9' }}>version.code</span> — kode unik terjemahan (contoh: &quot;AYT&quot;, &quot;BIS&quot;, &quot;KJV&quot;)</p>
            <p><span style={{ color: '#f1f5f9' }}>testament</span> — &quot;OT&quot; (Perjanjian Lama) atau &quot;NT&quot; (Perjanjian Baru)</p>
            <p><span style={{ color: '#f1f5f9' }}>number</span> — nomor urut kitab (1=Kejadian ... 66=Wahyu)</p>
          </div>

          {/* File picker */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
              File Database Alkitab
            </label>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
              style={{ border: '2px dashed #2a3347', background: '#0f1117' }}
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-2xl">{file?.name.toLowerCase().endsWith('.ewb') ? '🗄️' : '📄'}</div>
              <div className="flex-1">
                {file ? (
                  <>
                    <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{file.name}</p>
                    <p className="text-[10px]" style={{ color: '#475569' }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB · klik untuk ganti
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium" style={{ color: '#64748b' }}>Klik untuk pilih file</p>
                    <p className="text-[10px]" style={{ color: '#374151' }}>Format: .json · .ewb (EasyWorship Bible)</p>
                  </>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".json,.ewb" className="hidden" onChange={handleFileChange} />
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
                Versi: <strong>{result.version}</strong> · {result.totalBooks} kitab · {result.totalVerses?.toLocaleString()} ayat
              </p>
              <p className="text-[10px]" style={{ color: '#4ade80' }}>
                Refresh halaman Alkitab untuk melihat terjemahan baru
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
              disabled={!file || status === 'parsing' || status === 'importing'}
              className="px-5 py-2 rounded-lg text-sm font-semibold"
              style={{
                background: !file ? '#1e2535' : '#1d4ed8',
                color: !file ? '#475569' : 'white',
                cursor: !file ? 'not-allowed' : 'pointer',
                opacity: (status === 'parsing' || status === 'importing') ? 0.7 : 1,
              }}
            >
              {status === 'parsing' ? 'Parsing...' : status === 'importing' ? 'Mengimport...' : '⬆ Import Sekarang'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
