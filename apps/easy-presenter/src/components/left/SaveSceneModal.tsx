'use client'

import { useState, useEffect } from 'react'
import type { ServiceItem } from '../types'

interface Scene { id: number; name: string; service_date: string | null; created_at: string }

interface Props {
  items: ServiceItem[]
  onClose: () => void
  onLoad: (items: ServiceItem[]) => void
}

export function SaveSceneModal({ items, onClose, onLoad }: Props) {
  const [tab, setTab]           = useState<'save' | 'load'>('save')
  const [name, setName]         = useState('')
  const [date, setDate]         = useState('')
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

  const handleSave = async () => {
    setError(''); setSuccess('')
    if (!name.trim()) { setError('Nama scene wajib diisi'); return }

    setSaving(true)
    try {
      const payload = items.map(item => {
        // Strip blob URLs from media items (non-serializable across sessions)
        if (item.type === 'media') return { ...item, mediaUrl: undefined }
        return item
      })

      const res = await fetch('/api/scenes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), service_date: date || null, items: payload }),
      })
      const data = await res.json() as { id?: number; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Gagal menyimpan')
      setSuccess(`Scene "${name.trim()}" berhasil disimpan!`)
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const handleLoad = async (id: number) => {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/scenes/${id}/`)
      const data = await res.json() as { items?: ServiceItem[]; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Gagal memuat')
      if (data.items?.length) {
        onLoad(data.items)
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
                color: tab === t ? '#93c5fd' : '#475569',
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
              <div className="px-3 py-2 rounded-lg text-[11px]" style={{ background: '#0d1520', color: '#64748b' }}>
                Menyimpan {items.length} item urutan ibadah saat ini
              </div>

              {error && <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#3b1515', color: '#fca5a5' }}>{error}</div>}
              {success && <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#14532d', color: '#86efac' }}>{success}</div>}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: saving ? '#1e3a5f' : '#1d4ed8', color: 'white', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Menyimpan...' : '💾 Simpan Sekarang'}
              </button>
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
                    onClick={() => handleLoad(scene.id)}
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
