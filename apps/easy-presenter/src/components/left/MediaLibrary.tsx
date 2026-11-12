'use client'

import { useRef, useState } from 'react'

export interface MediaFile {
  id: string
  name: string
  url: string
  mediaType: 'image' | 'video' | 'ppt' | 'pdf'
  size: number
}

interface Props {
  onAdd: (file: MediaFile) => void
}

function detectMediaType(file: File): MediaFile['mediaType'] {
  const name = file.name.toLowerCase()
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'ppt'
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf'
  if (file.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/.test(name)) return 'video'
  return 'image'
}

const TYPE_ICONS: Record<MediaFile['mediaType'], string> = {
  image: '🖼',
  video: '🎬',
  ppt: '📊',
  pdf: '📄',
}

const TYPE_LABELS: Record<MediaFile['mediaType'], string> = {
  image: 'Gambar',
  video: 'Video',
  ppt: 'PowerPoint',
  pdf: 'PDF',
}

export function MediaLibrary({ onAdd }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<MediaFile[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    const newFiles: MediaFile[] = selected.map(f => ({
      id: `media_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: f.name,
      url: URL.createObjectURL(f),
      mediaType: detectMediaType(f),
      size: f.size,
    }))
    setFiles(prev => [...prev, ...newFiles])
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files)
    const newFiles: MediaFile[] = dropped.map(f => ({
      id: `media_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: f.name,
      url: URL.createObjectURL(f),
      mediaType: detectMediaType(f),
      size: f.size,
    }))
    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file) URL.revokeObjectURL(file.url)
      return prev.filter(f => f.id !== id)
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Drop zone / pick button */}
      <div className="p-2 flex-shrink-0">
        <div
          className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl cursor-pointer transition-colors"
          style={{ border: '2px dashed #2a3347', background: '#0f1117' }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="text-2xl">📁</div>
          <p className="text-xs font-medium" style={{ color: '#64748b' }}>Drag &amp; drop atau klik pilih</p>
          <p className="text-[10px]" style={{ color: '#374151' }}>JPG · PNG · MP4 · MOV · PPTX · PDF · GIF · WebP</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*,.ppt,.pptx,.pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-2 space-y-0.5">
        {files.length === 0 && (
          <div className="text-center py-4 text-[10px]" style={{ color: '#374151' }}>
            Belum ada file dipilih
          </div>
        )}
        {files.map(file => (
          <div
            key={file.id}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg group"
            style={{ background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e2535')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
              <div className="text-[10px]" style={{ color: '#475569' }}>
                {TYPE_LABELS[file.mediaType]} · {formatSize(file.size)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => onAdd(file)}
                className="text-[9px] px-2 py-1 rounded"
                style={{ background: '#1d4ed8', color: 'white' }}
              >
                + Ibadah
              </button>
              <button
                onClick={() => removeFile(file.id)}
                className="text-[9px] px-1.5 py-1 rounded"
                style={{ background: '#3b1515', color: '#fca5a5' }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
