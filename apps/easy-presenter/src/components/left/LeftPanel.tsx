'use client'

import { useState } from 'react'
import { SchedulePanel } from './SchedulePanel'
import { SongLibrary } from './SongLibrary'
import { ScriptureSearch } from './ScriptureSearch'
import type { ScriptureAddPayload } from './ScriptureSearch'
import { MediaLibrary } from './MediaLibrary'
import type { MediaFile } from './MediaLibrary'
import { SaveSceneModal } from './SaveSceneModal'
import type { ServiceItem } from '../types'

type LibTab = 'songs' | 'scripture' | 'media'

interface Props {
  service: ServiceItem[]
  activeItemId: string
  liveItemId: string | null
  onSelectItem: (id: string) => void
  onDeleteItem: (id: string) => void
  onAddScripture: (payload: ScriptureAddPayload) => void
  onAddSong: (item: ServiceItem) => void
  onAddMedia: (file: MediaFile) => void
  onQuickLaunch: (text: string, label: string) => void
  onLoadScene: (items: ServiceItem[]) => void
}

export function LeftPanel({
  service, activeItemId, liveItemId,
  onSelectItem, onDeleteItem, onAddScripture, onAddSong, onAddMedia,
  onQuickLaunch, onLoadScene,
}: Props) {
  const [libTab, setLibTab]       = useState<LibTab>('songs')
  const [splitPos, setSplitPos]   = useState(38)
  const [showScene, setShowScene] = useState(false)

  const tabs: { id: LibTab; label: string }[] = [
    { id: 'songs',     label: 'Lagu' },
    { id: 'scripture', label: 'Alkitab' },
    { id: 'media',     label: 'Media' },
  ]

  return (
    <>
      <div
        className="flex flex-col flex-shrink-0"
        style={{ width: 268, borderRight: '1px solid #2a3347', background: '#0f1117' }}
      >
        {/* ── Service Order section ── */}
        <div className="flex flex-col flex-shrink-0" style={{ height: `${splitPos}%` }}>
          <div
            className="flex items-center justify-between px-3 h-9 flex-shrink-0"
            style={{ borderBottom: '1px solid #2a3347', background: '#161b27' }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>
              Urutan Ibadah
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowScene(true)}
                className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
                style={{ background: '#1e2535', color: '#3b82f6', border: '1px solid #2a3347' }}
                title="Simpan / Muat Scene"
              >
                💾 Scene
              </button>
            </div>
          </div>
          <SchedulePanel
            service={service}
            activeItemId={activeItemId}
            liveItemId={liveItemId}
            onSelect={onSelectItem}
            onDelete={onDeleteItem}
          />
        </div>

        {/* ── Resize handle ── */}
        <div
          className="flex-shrink-0 h-1.5 cursor-row-resize flex items-center justify-center"
          style={{ background: '#2a3347' }}
          onMouseDown={e => {
            const startY = e.clientY
            const startPos = splitPos
            const onMove = (me: MouseEvent) => {
              const delta = ((me.clientY - startY) / window.innerHeight) * 100
              setSplitPos(Math.max(25, Math.min(75, startPos + delta)))
            }
            const onUp = () => {
              document.removeEventListener('mousemove', onMove)
              document.removeEventListener('mouseup', onUp)
            }
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp)
          }}
        >
          <div className="w-8 h-0.5 rounded-full" style={{ background: '#3a4357' }} />
        </div>

        {/* ── Library section ── */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Library tab bar */}
          <div
            className="flex items-center px-2 gap-1 flex-shrink-0 h-9"
            style={{ borderBottom: '1px solid #2a3347', background: '#161b27' }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest mr-1" style={{ color: '#475569' }}>
              Pustaka
            </span>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setLibTab(tab.id)}
                className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  background:   libTab === tab.id ? '#1e2535' : 'transparent',
                  color:        libTab === tab.id ? '#93c5fd' : '#475569',
                  borderBottom: libTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Library content */}
          <div className="flex-1 overflow-hidden">
            {libTab === 'songs'     && <SongLibrary onAdd={onAddSong} />}
            {libTab === 'scripture' && (
              <ScriptureSearch onAdd={onAddScripture} onQuickLaunch={onQuickLaunch} />
            )}
            {libTab === 'media'     && <MediaLibrary onAdd={onAddMedia} />}
          </div>
        </div>
      </div>

      {/* Scene modal */}
      {showScene && (
        <SaveSceneModal
          items={service}
          onClose={() => setShowScene(false)}
          onLoad={items => { onLoadScene(items); setShowScene(false) }}
        />
      )}
    </>
  )
}
