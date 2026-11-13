'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SlideCanvas } from '../shared/SlideCanvas'
import { SOLID_PRESETS, GRADIENT_PRESETS, ANIMATED_PRESETS } from '../right/FormatPanel'
import type { BgEntry, SlideBackground } from '../types'

// Drag payload MIME types
const MIME_LIBRARY  = 'application/x-easychurch-bg'       // JSON BgEntry from library
const MIME_PLAYLIST = 'application/x-easychurch-bg-index' // index inside playlist (reorder)

const uid = () => `bg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

const PRESET_LIBRARY: BgEntry[] = [
  ...ANIMATED_PRESETS.map(a => ({
    id: `preset_anim_${a.id}`, name: a.name, group: 'animated' as const,
    background: { type: 'animated' as const, animated: a.id },
  })),
  ...GRADIENT_PRESETS.map(g => ({
    id: `preset_grad_${g.name}`, name: g.name, group: 'gradient' as const,
    background: { type: 'gradient' as const, gradient: g.value },
  })),
  ...SOLID_PRESETS.map(c => ({
    id: `preset_solid_${c}`, name: c, group: 'solid' as const,
    background: { type: 'solid' as const, color: c },
  })),
]

interface ServerBgFile { name: string; file: string; kind: 'image' | 'video'; url: string }

function serverFileToEntry(f: ServerBgFile): BgEntry {
  return {
    id: `upload_${f.file}`, name: f.name, group: 'media',
    background: f.kind === 'video'
      ? { type: 'video', videoUrl: f.url, imageOverlayOpacity: 0.3 }
      : { type: 'image', imageUrl: f.url, imageOverlayOpacity: 0.4 },
  }
}

function isVideoFile(f: File): boolean {
  return f.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(f.name)
}

function isBgFile(f: File): boolean {
  return f.type.startsWith('image/') || isVideoFile(f)
}

/**
 * Store a background file on the server so it survives reloads.
 * Falls back to a session-only blob URL when the server is unavailable.
 */
export async function uploadBackgroundFile(f: File): Promise<{
  url: string; kind: 'image' | 'video'; name: string; file?: string; persisted: boolean
}> {
  const kind = isVideoFile(f) ? 'video' : 'image'
  try {
    const body = new FormData()
    body.append('file', f)
    const res  = await fetch('/api/backgrounds/', { method: 'POST', body })
    const data = await res.json() as Partial<ServerBgFile> & { error?: string }
    if (!res.ok || data.error || !data.url) throw new Error(data.error ?? 'upload failed')
    return { url: data.url, kind: data.kind ?? kind, name: data.name ?? f.name, file: data.file, persisted: true }
  } catch {
    return { url: URL.createObjectURL(f), kind, name: f.name, persisted: false }
  }
}

// ── Library state — lives in UnifiedLayout so it survives item switches ──

export interface BgLibrary {
  library: BgEntry[]   // uploads (persisted on server) + presets
  addUploads: (files: File[]) => Promise<BgEntry[]>
}

export function useBgLibrary(): BgLibrary {
  const [uploads, setUploads] = useState<BgEntry[]>([])

  useEffect(() => {
    fetch('/api/backgrounds/')
      .then(r => r.json() as Promise<{ files?: ServerBgFile[] }>)
      .then(d => setUploads((d.files ?? []).map(serverFileToEntry)))
      .catch(() => { /* server unavailable — presets only */ })
  }, [])

  const library = useMemo(() => [...uploads, ...PRESET_LIBRARY], [uploads])

  const addUploads = useCallback(async (files: File[]) => {
    const results = await Promise.all(files.filter(isBgFile).map(uploadBackgroundFile))
    const entries: BgEntry[] = results.map(r => r.persisted && r.file
      ? serverFileToEntry({ name: r.name, file: r.file, kind: r.kind, url: r.url })
      : {
          id: uid(), name: r.name, group: 'media',
          background: r.kind === 'video'
            ? { type: 'video', videoUrl: r.url, imageOverlayOpacity: 0.3 }
            : { type: 'image', imageUrl: r.url, imageOverlayOpacity: 0.4 },
        })
    if (entries.length) setUploads(prev => [...entries, ...prev])
    return entries
  }, [])

  return { library, addUploads }
}

// ── Pure playlist helpers ──

/** Each playlist slot gets its own id so the same background can appear twice */
export function playlistInsert(list: BgEntry[], entry: BgEntry, at = list.length): BgEntry[] {
  const n = [...list]
  n.splice(at, 0, { ...entry, id: uid() })
  return n
}

function playlistMove(list: BgEntry[], from: number, to: number): BgEntry[] {
  if (from === to || from < 0 || from >= list.length) return list
  const n = [...list]
  const [moved] = n.splice(from, 1)
  n.splice(to > from ? to - 1 : to, 0, moved!)
  return n
}

/** Next/previous entry id for Shift+←/→ */
export function playlistStep(list: BgEntry[], currentId: string | undefined, dir: 1 | -1): string | undefined {
  if (!list.length) return currentId
  const idx  = list.findIndex(e => e.id === currentId)
  const next = idx < 0 ? (dir === 1 ? 0 : list.length - 1) : idx + dir
  return next >= 0 && next < list.length ? list[next]!.id : currentId
}

// ── Thumbnail ──

const THUMB_TS = {
  fontFamily: 'Inter, sans-serif', fontSize: 72, fontWeight: 'normal' as const,
  textAlign: 'center' as const, verticalPosition: 'center' as const, positionOffset: 0,
  color: '#fff', shadow: false, outline: false, outlineColor: '#000', lineHeight: 1.4,
}

function BgThumb({ bg }: { bg: SlideBackground }) {
  return (
    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
      <div className="absolute inset-0">
        <SlideCanvas text="" background={bg} textStyle={THUMB_TS} containerWidth={120} thumbnail />
      </div>
    </div>
  )
}

export function PanelHeader({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 h-7 flex-shrink-0"
      style={{ background: '#161b27', borderBottom: '1px solid #2a3347', borderTop: '1px solid #2a3347' }}>
      {typeof title === 'string'
        ? <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#ffffff' }}>{title}</span>
        : title}
      {children}
    </div>
  )
}

// ── Background Playlist (6-column grid, drop target) — per service item ──

export interface PlaylistPatch { bgPlaylist?: BgEntry[]; activeBgId?: string | undefined }

interface PlaylistProps {
  playlist: BgEntry[]
  activeBgId: string | undefined
  isLive: boolean
  onUpdate: (patch: PlaylistPatch) => void
  onUploadFiles: (files: File[]) => Promise<BgEntry[]>
  /** Replaces the "Background Playlist" title (e.g. with tabs) */
  title?: React.ReactNode
  /** Fill the parent instead of taking the 25 share of the center column */
  embedded?: boolean
}

export function BackgroundPlaylistPanel({
  playlist, activeBgId, isLive, onUpdate, onUploadFiles, title, embedded = false,
}: PlaylistProps) {
  const [dropAt, setDropAt] = useState<number | null>(null)

  const handleDrop = async (e: React.DragEvent, at: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDropAt(null)

    const fromIdx = e.dataTransfer.getData(MIME_PLAYLIST)
    if (fromIdx !== '') { onUpdate({ bgPlaylist: playlistMove(playlist, Number(fromIdx), at) }); return }

    const json = e.dataTransfer.getData(MIME_LIBRARY)
    if (json) { onUpdate({ bgPlaylist: playlistInsert(playlist, JSON.parse(json) as BgEntry, at) }); return }

    // Files dropped straight from the OS → upload to library, then add to playlist
    if (e.dataTransfer.files.length) {
      const entries = await onUploadFiles(Array.from(e.dataTransfer.files))
      let next = playlist
      entries.forEach((entry, i) => { next = playlistInsert(next, entry, at + i) })
      onUpdate({ bgPlaylist: next })
    }
  }

  const allowDrop = (e: React.DragEvent, at: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(MIME_PLAYLIST) ? 'move' : 'copy'
    if (dropAt !== at) setDropAt(at)
  }

  const remove = (id: string) => onUpdate({
    bgPlaylist: playlist.filter(e => e.id !== id),
    ...(id === activeBgId ? { activeBgId: undefined } : {}),
  })

  return (
    <div className="flex flex-col min-h-0 overflow-hidden" style={{ flex: embedded ? '1 1 0' : '25 1 0' }}>
      <PanelHeader title={title ?? 'Background Playlist'}>
        <span className="text-[9px]" style={{ color: '#94a3b8' }}>Klik = ganti background live · Shift+←/→</span>
        <div className="flex-1" />
        {activeBgId && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
            style={{ background: isLive ? '#7f1d1d' : '#1e3a5f', color: isLive ? '#fca5a5' : '#93c5fd' }}>
            {isLive ? '● BG LIVE' : 'BG siap'}
          </span>
        )}
        <button
          onClick={() => onUpdate({ activeBgId: undefined })}
          disabled={!activeBgId}
          title="Kembali ke background bawaan item"
          className="text-[9px] px-2 py-0.5 rounded"
          style={{
            background: '#1e2535', border: '1px solid #2a3347',
            color: activeBgId ? '#94a3b8' : '#2d3748',
          }}
        >↺ Default</button>
      </PanelHeader>

      <div
        className="flex-1 overflow-y-auto p-2.5 min-h-0"
        onDragOver={e => allowDrop(e, playlist.length)}
        onDragLeave={e => { if (e.currentTarget === e.target) setDropAt(null) }}
        onDrop={e => handleDrop(e, playlist.length)}
      >
        {playlist.length === 0 ? (
          <div className="h-full flex items-center justify-center rounded-xl text-center px-4"
            style={{ border: `2px dashed ${dropAt != null ? '#3b82f6' : '#2a3347'}`, minHeight: 80 }}>
            <p className="text-[10px]" style={{ color: '#94a3b8' }}>
              Drag background dari Library di bawah (atau file gambar/video) ke sini
            </p>
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
            {playlist.map((entry, idx) => {
              const active = entry.id === activeBgId
              return (
                <div
                  key={entry.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData(MIME_PLAYLIST, String(idx))
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={e => { e.stopPropagation(); allowDrop(e, idx) }}
                  onDrop={e => handleDrop(e, idx)}
                  onClick={() => onUpdate({ activeBgId: entry.id })}
                  className="relative rounded-lg overflow-hidden cursor-pointer group"
                  style={{
                    border:    active ? `2px solid ${isLive ? '#dc2626' : '#3b82f6'}` : '2px solid #2a3347',
                    boxShadow: dropAt === idx ? '-4px 0 0 0 #3b82f6' : active && isLive ? '0 0 0 3px rgba(220,38,38,0.2)' : 'none',
                    background: '#161b27',
                  }}
                >
                  <BgThumb bg={entry.background} />
                  <div className="absolute bottom-1 left-1 text-[9px] font-mono px-1 rounded"
                    style={{ background: 'rgba(0,0,0,0.6)', color: '#94a3b8' }}>{idx + 1}</div>
                  {active && isLive && (
                    <div className="absolute top-1 left-1 text-[8px] font-bold px-1 rounded"
                      style={{ background: '#dc2626', color: '#fff' }}>LIVE</div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); remove(entry.id) }}
                    title="Hapus dari playlist"
                    className="absolute top-1 right-1 w-4 h-4 rounded text-[9px] leading-none opacity-0 group-hover:opacity-100"
                    style={{ background: 'rgba(0,0,0,0.7)', color: '#fca5a5' }}
                  >✕</button>
                  <div className="px-1.5 py-0.5 text-[9px] truncate"
                    style={{ color: active ? '#e2e8f0' : '#64748b', borderTop: '1px solid #2a3347' }}>
                    {entry.name}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Background Library (source list, drag from here) ──

type LibFilter = 'all' | BgEntry['group']
const FILTERS: { id: LibFilter; label: string }[] = [
  { id: 'all',      label: 'Semua' },
  { id: 'media',    label: 'Media' },
  { id: 'animated', label: 'Animasi' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'solid',    label: 'Solid' },
]

interface LibraryProps {
  lib: BgLibrary
  onAddToPlaylist: (entry: BgEntry) => void
}

export function BackgroundLibraryPanel({ lib, onAddToPlaylist }: LibraryProps) {
  const [filter, setFilter]       = useState<LibFilter>('all')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const items = filter === 'all' ? lib.library : lib.library.filter(e => e.group === filter)

  return (
    <div className="flex flex-col min-h-0 overflow-hidden" style={{ flex: '15 1 0' }}>
      <PanelHeader title="Background Library">
        <div className="flex gap-0.5">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{
                background: filter === f.id ? '#1e3a5f' : 'transparent',
                color:      '#ffffff',
              }}>{f.label}</button>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-[9px]" style={{ color: '#94a3b8' }}>Drag ke playlist · 2× = tambah</span>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-[9px] px-2 py-0.5 rounded"
          style={{ background: '#1d4ed8', color: '#fff', opacity: uploading ? 0.6 : 1 }}
        >{uploading ? 'Upload…' : '+ Upload'}</button>
        <input
          ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden"
          onChange={async e => {
            const files = Array.from(e.target.files ?? [])
            if (fileRef.current) fileRef.current.value = ''
            setUploading(true)
            await lib.addUploads(files)
            setUploading(false)
            setFilter('media')
          }}
        />
      </PanelHeader>

      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0 px-2.5 py-2">
        <div className="flex gap-2 h-full">
          {items.map(entry => (
            <div
              key={entry.id}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData(MIME_LIBRARY, JSON.stringify(entry))
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onDoubleClick={() => onAddToPlaylist(entry)}
              title={`${entry.name} — drag ke playlist`}
              className="flex-shrink-0 h-full flex flex-col rounded-lg overflow-hidden cursor-grab"
              style={{ border: '1px solid #2a3347', background: '#161b27', aspectRatio: '16 / 11' }}
            >
              <div className="flex-1 min-h-0 relative">
                <div className="absolute inset-0">
                  <SlideCanvas text="" background={entry.background} textStyle={THUMB_TS} containerWidth={120} thumbnail />
                </div>
              </div>
              <div className="px-1.5 py-0.5 text-[9px] truncate flex-shrink-0" style={{ color: '#64748b' }}>
                {entry.name}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="flex items-center text-[10px]" style={{ color: '#94a3b8' }}>
              Belum ada media — klik + Upload
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
