'use client'

import { useState, useEffect } from 'react'
import type { ServiceItem } from '../types'
import { stripBlobUrls } from '../types'
import { saveAllSongSettings } from '../shared/songSettings'

interface Scene { id: number; name: string; service_date: string | null; created_at: string }

/** The scene currently open in the presenter (for overwrite) */
export interface SceneRef { id: number; name: string; date: string | null }

interface Props {
  items: ServiceItem[]
  currentScene: SceneRef | null
  onClose: () => void
  onLoad: (items: ServiceItem[], scene: SceneRef) => void
  onSaved: (scene: SceneRef) => void
}

export function SaveSceneModal({ items, currentScene, onClose, onLoad, onSaved }: Props) {
  const [tab, setTab]           = useState<'save' | 'load'>('save')
  const [name, setName]         = useState(currentScene?.name ?? '')
  const [date, setDate]         = useState(currentScene?.date ?? '')
  const [alsoSongs, setAlsoSongs] = useState(true)
  const [saving, setSaving]     = useState(false)
  const [scenes, setScenes]     = useState<Scene[]>([])
  const [loading, setLoading]   = useState(false)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  useEffect(() => {
    if (tab === 'load') fetchScenes()
  }, [tab])

  const fetchScenes = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/scenes/')
      const data = await res.json() as { scenes?: Scene[] }
      setScenes(data.scenes ?? [])
    } catch { setScenes([]) }
    finally { setLoading(false) }
  }

  // overwrite = replace the currently open scene; otherwise create a new one
  const handleSave = async (overwrite: boolean) => {
    setError(''); setSuccess('')
    if (!name.trim()) { setError('Nama scene wajib diisi'); return }

    setSaving(true)
    try {
      // Blob URLs (session-only uploads) are dead after a reload — drop them
      const payload = stripBlobUrls(items.filter(i => i.id !== '__quick__'))
      const body    = JSON.stringify({ name: name.trim(), service_date: date || null, items: payload })

      const res = overwrite && currentScene
        ? await fetch(`/api/scenes/${currentScene.id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })
        : await fetch('/api/scenes/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      const data = await res.json() as { id?: number; error?: string }
      if (!res.ok || data.error || !data.id) throw new Error(data.error ?? 'Gagal menyimpan')
      onSaved({ id: data.id, name: name.trim(), date: date || null })

      let msg = `Scene "${name.trim()}" berhasil ${overwrite ? 'diperbarui' : 'disimpan'}!`
      if (alsoSongs) {
        try {
          const n = await saveAllSongSettings(items)
          if (n) msg += ` Setting ${n} lagu juga disimpan ke database lagu.`
        } catch (e) {
          msg += ` (Setting lagu gagal disimpan: ${e instanceof Error ? e.message : 'error'})`
        }
      }
      setSuccess(msg)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const handleLoad = async (scene: Scene) => {
    const id = scene.id
    setLoadingId(id)
    try {
      const res = await fetch(`/api/scenes/${id}/`)
      const data = await res.json() as { items?: ServiceItem[]; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Gagal memuat')
      if (data.items?.length) {
        onLoad(data.items, { id, name: scene.name, date: scene.service_date })
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat scene')
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await fetch(`/api/scenes/${id}/`, { method: 'DELETE' })
      setScenes(prev => prev.filter(s => s.id !== id))
    } catch { /* ignore */ }
    finally { setDeletingId(null) }
  }

  const formatDate = (s: string) => new Date(s).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{ width: 480, maxHeight: '85vh', background: '#161b27', border: '1px solid #2a3347' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: '1px solid #2a3347', background: '#1a2235' }}>
          <h2 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>Urutan Ibadah — Scene</h2>
          <button onClick={onClose} className="text-lg leading-none" style={{ color: '#475569' }}>×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: '#2a3347' }}>
          {(['save', 'load'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); setSuccess('') }}
              className="flex-1 py-2.5 text-xs font-semibold transition-colors"
              style={{
                background: tab === t ? '#1e2535' : 'transparent',
                color: '#ffffff',
                borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
              }}
            >
              {t === 'save' ? '💾 Simpan Scene' : '📂 Muat Scene'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── SAVE TAB ── */}
          {tab === 'save' && (
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>
                  Nama Scene *
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ibadah Minggu, 16 Nov 2026..."
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                  style={{ background: '#0f1117', border: '1px solid #2a3347', color: '#f1f5f9' }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>
                  Tanggal Ibadah (opsional)
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                  style={{ background: '#0f1117', border: '1px solid #2a3347', color: '#f1f5f9', colorScheme: 'dark' }}
                />
              </div>
              <div className="px-3 py-2 rounded-lg text-[11px]" style={{ background: '#0d1520', color: '#94a3b8' }}>
                Menyimpan {items.length} item urutan ibadah — termasuk background playlist & animasi teks tiap lagu
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={alsoSongs} onChange={e => setAlsoSongs(e.target.checked)} className="mt-0.5" />
                <span className="text-[11px]" style={{ color: '#e2e8f0' }}>
                  Simpan juga sebagai <b>default lagu</b> di database
                  <span className="block text-[10px]" style={{ color: '#94a3b8' }}>
                    Saat lagu ini dipakai di urutan ibadah lain, setting ini otomatis terpakai
                  </span>
                </span>
              </label>

              {error && <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#3b1515', color: '#fca5a5' }}>{error}</div>}
              {success && <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#14532d', color: '#86efac' }}>{success}</div>}

              {currentScene ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: saving ? '#1e3a5f' : '#1d4ed8', color: 'white', opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? 'Menyimpan...' : `💾 Simpan (timpa "${currentScene.name}")`}
                  </button>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl text-sm"
                    style={{ background: '#1e2535', color: '#ffffff', border: '1px solid #2a3347', opacity: saving ? 0.7 : 1 }}
                  >+ Simpan baru</button>
                </div>
              ) : (
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: saving ? '#1e3a5f' : '#1d4ed8', color: 'white', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Menyimpan...' : '💾 Simpan Sekarang'}
                </button>
              )}
            </div>
          )}

          {/* ── LOAD TAB ── */}
          {tab === 'load' && (
            <div className="p-4">
              {loading && (
                <div className="text-center py-8 text-xs" style={{ color: '#475569' }}>Memuat daftar scene...</div>
              )}
              {!loading && !scenes.length && (
                <div className="text-center py-8">
                  <p className="text-xs" style={{ color: '#475569' }}>Belum ada scene tersimpan</p>
                  <p className="text-[10px] mt-1" style={{ color: '#374151' }}>Simpan urutan ibadah dari tab Simpan</p>
                </div>
              )}
              {!loading && scenes.map(scene => (
                <div
                  key={scene.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1.5"
                  style={{ background: '#1a2235', border: '1px solid #2a3347' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: '#f1f5f9' }}>{scene.name}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: '#475569' }}>
                      {scene.service_date ? `📅 ${scene.service_date} · ` : ''}
                      {formatDate(scene.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleLoad(scene)}
                    disabled={loadingId === scene.id}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0"
                    style={{ background: '#1d4ed8', color: 'white', opacity: loadingId === scene.id ? 0.6 : 1 }}
                  >
                    {loadingId === scene.id ? '...' : '▶ Muat'}
                  </button>
                  <button
                    onClick={() => handleDelete(scene.id)}
                    disabled={deletingId === scene.id}
                    className="text-xs px-2 py-1.5 rounded-lg flex-shrink-0"
                    style={{ background: '#3b1515', color: '#fca5a5', opacity: deletingId === scene.id ? 0.6 : 1 }}
                  >
                    🗑
                  </button>
                </div>
              ))}

              {error && (
                <div className="px-3 py-2 rounded-lg text-xs mt-2" style={{ background: '#3b1515', color: '#fca5a5' }}>{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex-shrink-0 text-right" style={{ borderTop: '1px solid #2a3347' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3347' }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
