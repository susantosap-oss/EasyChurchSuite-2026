'use client'

import { useEffect, useRef, useState } from 'react'
import { convertPdfToSlides } from '@/lib/pdfToSlides'
import { useSpeakerDecks, markSpeakerDeck, unmarkSpeakerDeck } from '@/lib/speakerDecks'

export interface MediaFile {
  id: string
  name: string
  url: string
  mediaType: 'image' | 'video' | 'ppt' | 'pdf' | 'slides'
  size: number
  pages?: string[]   // mediaType 'slides': one image URL per page
  playable?: boolean // false = needs conversion before it can be shown
  job?: ConvertJob | null
}

interface ConvertJob {
  state: 'queued' | 'converting' | 'done' | 'error'
  progress: number
  reasons: string[]
  encoder?: string
  error?: string
}

interface Props {
  onAdd: (file: MediaFile) => void
}

interface ServerMedia {
  file: string
  name: string
  kind: 'image' | 'video' | 'pdf' | 'ppt'
  size: number
  url: string
  playable?: boolean
  job?: (ConvertJob & { file: string }) | null
  note?: string | null
}

const TYPE_ICONS: Record<MediaFile['mediaType'], string> = {
  image: '🖼',
  video: '🎬',
  ppt: '📊',
  pdf: '📄',
  slides: '📑',
}

const TYPE_LABELS: Record<MediaFile['mediaType'], string> = {
  image: 'Gambar',
  video: 'Video',
  ppt: 'PowerPoint',
  pdf: 'PDF',
  slides: 'Presentasi',
}

// Convert-only containers (.avi / .mkv / .wmv …) are accepted and turned into MP4 by the server (FFmpeg)
const ACCEPT_RE = /\.(jpe?g|png|webp|gif|mp4|mov|webm|m4v|avi|mkv|wmv|mpe?g|flv|3gp|m?ts|m2ts|pdf|pptx?)$/i

const fromServer = (m: ServerMedia): MediaFile => ({
  id: m.file, name: m.name, url: m.url, mediaType: m.kind, size: m.size,
  playable: m.playable ?? true, job: m.job ?? null,
})

const isBusy = (f: MediaFile) => f.job?.state === 'queued' || f.job?.state === 'converting'

/** Stream one file to the server with upload progress (0–1) */
function uploadMedia(file: File, onProgress: (p: number) => void): Promise<ServerMedia> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/media/?name=${encodeURIComponent(file.name)}`)
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total) }
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as ServerMedia & { error?: string }
        if (xhr.status >= 400 || data.error) reject(new Error(data.error ?? `HTTP ${xhr.status}`))
        else resolve(data)
      } catch { reject(new Error(`HTTP ${xhr.status}`)) }
    }
    xhr.onerror = () => reject(new Error('Koneksi ke server gagal'))
    xhr.send(file)
  })
}

async function fetchList(): Promise<MediaFile[]> {
  const d = await fetch('/api/media/').then(r => r.json() as Promise<{ files?: ServerMedia[] }>)
  return (d.files ?? []).map(fromServer)
}

function statusText(file: MediaFile): string | null {
  const job = file.job
  if (job?.state === 'queued') return 'Antre konversi video…'
  if (job?.state === 'converting') {
    const enc = job.encoder ? ` · ${job.encoder.replace('h264_', '').toUpperCase()}` : ''
    return `Konversi ke MP4 ${Math.round(job.progress * 100)}%${enc}`
  }
  if (job?.state === 'error') return `Konversi gagal: ${job.error ?? ''}`
  if (file.playable === false) return 'Perlu konversi (FFmpeg tidak ditemukan)'
  return null
}

export function MediaLibrary({ onAdd }: Props) {
  const speakerDecks = useSpeakerDecks()
  const speakerFiles = new Set(speakerDecks.map(d => d.file))
  const fileRef = useRef<HTMLInputElement>(null)
  const [files, setFiles]           = useState<MediaFile[]>([])
  const [loading, setLoading]       = useState(true)
  const [uploads, setUploads]       = useState<{ name: string; progress: number }[]>([])
  const [pdfConv, setPdfConv]       = useState<{ id: string; done: number; total: number } | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [error, setError]           = useState('')

  // Files are stored on the server (data/media) — reload the list on mount
  useEffect(() => {
    fetchList()
      .then(setFiles)
      .catch(() => setError('Daftar media tidak bisa dimuat dari server'))
      .finally(() => setLoading(false))
  }, [])

  // While videos are converting: poll progress, reload the list when a job finishes
  const anyBusy = files.some(isBusy)
  useEffect(() => {
    if (!anyBusy) return
    const t = setInterval(async () => {
      try {
        const d = await fetch('/api/media/status/').then(r => r.json() as Promise<{ jobs?: (ConvertJob & { file: string })[] }>)
        const byFile = new Map((d.jobs ?? []).map(j => [j.file, j]))
        const finished = (d.jobs ?? []).some(j => (j.state === 'done' || j.state === 'error') &&
          files.some(f => f.id === j.file && isBusy(f)))
        if (finished) setFiles(await fetchList())
        else setFiles(prev => prev.map(f => (byFile.has(f.id) ? { ...f, job: byFile.get(f.id)! } : f)))
      } catch { /* retry next tick */ }
    }, 1500)
    return () => clearInterval(t)
  }, [anyBusy, files])

  const addFiles = async (selected: File[]) => {
    setError('')
    const valid = selected.filter(f => ACCEPT_RE.test(f.name))
    if (valid.length < selected.length) setError('Sebagian file dilewati — format tidak didukung')
    for (const f of valid) {
      setUploads(u => [...u, { name: f.name, progress: 0 }])
      try {
        const saved = await uploadMedia(f, p =>
          setUploads(u => u.map(x => (x.name === f.name ? { ...x, progress: p } : x))))
        setFiles(prev => [fromServer(saved), ...prev])
        if (saved.note) setError(saved.note)
      } catch (err) {
        setError(`Upload ${f.name} gagal: ${err instanceof Error ? err.message : 'error'}`)
      } finally {
        setUploads(u => u.filter(x => x.name !== f.name))
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void addFiles(Array.from(e.target.files ?? []))
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    void addFiles(Array.from(e.dataTransfer.files))
  }

  // Permanent delete (second click confirms)
  const removeFile = async (file: MediaFile) => {
    if (confirmDel !== file.id) { setConfirmDel(file.id); return }
    setConfirmDel(null)
    try {
      // No trailing slash: the stored name ends in a file extension
      const res = await fetch(`/api/media/${encodeURIComponent(file.id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setFiles(prev => prev.filter(f => f.id !== file.id))
      if (speakerFiles.has(file.id)) void unmarkSpeakerDeck(file.id).catch(() => {})
    } catch (err) {
      setError(`Gagal menghapus: ${err instanceof Error ? err.message : 'error'}`)
    }
  }

  // PDF → one image per page (stored on the server)
  const renderPdf = async (file: MediaFile): Promise<string[]> => {
    setPdfConv({ id: file.id, done: 0, total: 0 })
    try {
      const blob = await fetch(file.url).then(r => r.blob())
      const pages = await convertPdfToSlides(
        new File([blob], file.name, { type: 'application/pdf' }),
        p => setPdfConv({ id: file.id, ...p }),
      )
      if (!pages.length) throw new Error('PDF tidak punya halaman')
      return pages
    } finally {
      setPdfConv(null)
    }
  }

  // PDF added as a presentation (page-by-page slides); pages already rendered for the Speaker are reused
  const addPdf = async (file: MediaFile) => {
    setError('')
    try {
      const marked = speakerDecks.find(d => d.file === file.id && d.pages.length)
      const pages  = marked?.pages ?? await renderPdf(file)
      onAdd({ ...file, mediaType: 'slides', url: pages[0]!, pages, name: file.name.replace(/\.pdf$/i, '') })
    } catch (err) {
      setError(`Gagal konversi PDF: ${err instanceof Error ? err.message : 'error'}`)
    }
  }

  // [v] Speaker — the file appears on the Speaker remote; PDFs are rendered once, here
  const toggleSpeaker = async (file: MediaFile) => {
    setError('')
    try {
      if (speakerFiles.has(file.id)) { await unmarkSpeakerDeck(file.id); return }
      const kind = file.mediaType
      if (kind !== 'pdf' && kind !== 'image' && kind !== 'video') return
      const pages = kind === 'pdf' ? await renderPdf(file) : []
      if (pages.some(p => !p.startsWith('/api/'))) throw new Error('halaman gagal disimpan di server')
      await markSpeakerDeck({ file: file.id, name: file.name.replace(/\.pdf$/i, ''), kind, url: file.url, pages })
    } catch (err) {
      setError(`Gagal menandai untuk Speaker: ${err instanceof Error ? err.message : 'error'}`)
    }
  }

  const handleAdd = (file: MediaFile) => {
    if (file.mediaType === 'pdf') { void addPdf(file); return }
    onAdd(file)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Drop zone / pick button */}
      <div className="p-2 flex-shrink-0 space-y-2">
        <div
          className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl cursor-pointer transition-colors"
          style={{ border: '2px dashed #2a3347', background: '#0f1117' }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="text-2xl">📁</div>
          <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>Drag &amp; drop atau klik pilih</p>
          <p className="text-[10px] text-center px-2" style={{ color: '#64748b' }}>
            JPG · PNG · MP4 · MOV · WebM · PDF — AVI/MKV/WMV otomatis dikonversi
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*,.avi,.mkv,.wmv,.mpg,.mpeg,.flv,.3gp,.ts,.mts,.m2ts,.ppt,.pptx,.pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploads.map(u => (
          <div key={u.name} className="px-2 py-1.5 rounded-lg" style={{ background: '#0f1117', border: '1px solid #2a3347' }}>
            <div className="flex justify-between text-[10px]" style={{ color: '#e2e8f0' }}>
              <span className="truncate">⬆ {u.name}</span>
              <span>{Math.round(u.progress * 100)}%</span>
            </div>
            <div className="h-1 mt-1 rounded-full overflow-hidden" style={{ background: '#1e2535' }}>
              <div className="h-full" style={{ width: `${u.progress * 100}%`, background: '#3b82f6' }} />
            </div>
          </div>
        ))}

        {error && (
          <div className="px-2 py-1.5 rounded text-[10px]" style={{ background: '#3b1515', color: '#fca5a5' }}>{error}</div>
        )}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-2 space-y-0.5">
        {!loading && files.length === 0 && (
          <div className="text-center py-4 text-[10px]" style={{ color: '#64748b' }}>
            Belum ada file — upload untuk menyimpan ke library
          </div>
        )}
        {loading && (
          <div className="text-center py-4 text-[10px]" style={{ color: '#64748b' }}>Memuat media…</div>
        )}
        {files.map(file => {
          const conv       = pdfConv?.id === file.id ? pdfConv : null
          const confirming = confirmDel === file.id
          const busy       = isBusy(file)
          const blocked    = busy || file.playable === false || file.mediaType === 'ppt'
          const status     = statusText(file)
          const forSpeaker = speakerFiles.has(file.id)
          return (
            <div
              key={file.id}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg group"
              style={{ background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e2535')}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (confirming) setConfirmDel(null) }}
            >
              {/* Thumbnail */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg overflow-hidden"
                style={{ background: '#161b27', border: '1px solid #2a3347' }}
              >
                {file.mediaType === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.url} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span>{TYPE_ICONS[file.mediaType]}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: '#cbd5e1' }}>{file.name}</div>
                <div className="text-[10px] truncate"
                  title={file.job?.reasons.join(' · ')}
                  style={{ color: conv || busy ? '#fbbf24' : file.job?.state === 'error' ? '#fca5a5' : '#64748b' }}>
                  {conv
                    ? `Mengonversi halaman ${conv.done}/${conv.total || '…'}`
                    : status ?? (file.mediaType === 'ppt'
                      ? 'Simpan sebagai PDF dulu di PowerPoint'
                      : `${TYPE_LABELS[file.mediaType]} · ${formatSize(file.size)}`)}
                </div>
                {!blocked && (
                  <button
                    onClick={() => void toggleSpeaker(file)}
                    disabled={!!pdfConv}
                    title={forSpeaker
                      ? 'Bisa dibuka & dikontrol dari Remote Speaker — klik untuk melepas'
                      : 'Izinkan Remote Speaker membuka & mengontrol file ini'}
                    className="flex items-center gap-1 mt-0.5 text-[9px] leading-none"
                    style={{ color: forSpeaker ? '#fbbf24' : '#64748b' }}
                  >
                    <span className="w-3 h-3 rounded-sm flex items-center justify-center text-[9px] leading-none"
                      style={{ background: forSpeaker ? '#f59e0b' : 'transparent', border: '1px solid #f59e0b', color: '#000' }}>
                      {forSpeaker ? '✓' : ''}
                    </span>
                    Speaker
                  </button>
                )}
                {busy && (
                  <div className="h-0.5 mt-1 rounded-full overflow-hidden" style={{ background: '#1e2535' }}>
                    <div className="h-full" style={{ width: `${(file.job?.progress ?? 0) * 100}%`, background: '#f59e0b' }} />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className={`gap-1 flex-shrink-0 ${conv || confirming ? 'flex' : 'hidden group-hover:flex'}`}>
                {!confirming && (
                  <button
                    onClick={() => handleAdd(file)}
                    disabled={!!pdfConv || blocked}
                    title={file.mediaType === 'pdf' ? 'Konversi tiap halaman jadi slide' : undefined}
                    className="text-[9px] px-2 py-1 rounded"
                    style={{
                      background: blocked ? '#1e2535' : '#1d4ed8',
                      color: blocked ? '#64748b' : 'white',
                      opacity: pdfConv && !conv ? 0.5 : 1,
                    }}
                  >
                    {conv ? '…' : '+ Ibadah'}
                  </button>
                )}
                <button
                  onClick={() => void removeFile(file)}
                  disabled={!!conv || busy}
                  title="Hapus permanen dari library"
                  className="text-[9px] px-1.5 py-1 rounded"
                  style={{ background: confirming ? '#b91c1c' : '#3b1515', color: confirming ? '#fff' : '#fca5a5' }}
                >
                  {confirming ? 'Hapus?' : '✕'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
