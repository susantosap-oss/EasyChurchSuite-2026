'use client'

import { useState } from 'react'
import type { Slide } from '../types'

interface Props {
  liveSlide?: Slide | null
}

export function StudioPanel({ liveSlide }: Props = {}) {
  const [ltName, setLtName]   = useState('')
  const [ltTitle, setLtTitle] = useState('')
  const [ltLive, setLtLive]   = useState(false)

  const pushLowerThird = () => {
    if (!ltName) return
    window.electronAPI?.sendSlideCommand({ type: 'lower-third', name: ltName, title: ltTitle })
    setLtLive(true)
  }
  const clearLowerThird = () => {
    window.electronAPI?.sendSlideCommand({ type: 'clear' })
    setLtLive(false)
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">

      {/* Stage Monitor mini */}
      <div className="p-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest block mb-2" style={{ color: '#475569' }}>
          Stage Monitor
        </span>
        <div
          className="w-full rounded-lg overflow-hidden"
          style={{ paddingTop: '56.25%', position: 'relative', background: '#000', border: '1px solid #2a3347' }}
        >
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 flex items-center justify-center px-3" style={{ borderBottom: '1px solid #1f2937' }}>
              <p className="text-white text-center text-[9px] leading-relaxed" style={{ whiteSpace: 'pre-line' }}>
                {liveSlide?.text?.split('\n')[0] ?? '—'}
              </p>
            </div>
            <div className="flex items-center px-3 py-1">
              <span className="text-[8px] flex-1" style={{ color: '#475569' }}>
                NEXT: {liveSlide?.text?.split('\n').slice(1).join(' ').substring(0, 28) ?? '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Screen selector */}
        <div
          className="flex items-center justify-between px-3 py-2 rounded-lg mt-2"
          style={{ background: '#1e2535', border: '1px solid #2a3347' }}
        >
          <span className="text-[10px]" style={{ color: '#64748b' }}>Output Screen</span>
          <select
            className="bg-transparent text-[10px] focus:outline-none"
            style={{ color: '#94a3b8' }}
          >
            <option>Display 1 (Primary)</option>
            <option>Display 2 (Proyektor)</option>
          </select>
        </div>
      </div>

      <div className="mx-3 my-1" style={{ height: '1px', background: '#2a3347' }} />

      {/* Lower Thirds */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>
            Lower Thirds
          </span>
          {ltLive && (
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#dc2626', color: 'white' }}>LIVE</span>
          )}
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] block mb-1" style={{ color: '#475569' }}>Nama</label>
            <input value={ltName} onChange={e => setLtName(e.target.value)}
              placeholder="Pdt. Yohanes Santoso"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
              style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#e2e8f0' }} />
          </div>
          <div>
            <label className="text-[10px] block mb-1" style={{ color: '#475569' }}>Jabatan</label>
            <input value={ltTitle} onChange={e => setLtTitle(e.target.value)}
              placeholder="Gembala Sidang"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
              style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#e2e8f0' }} />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={pushLowerThird}
              className="py-2 rounded-lg text-xs font-semibold"
              style={{ background: '#1d4ed8', color: 'white' }}>
              Push Live
            </button>
            <button onClick={clearLowerThird}
              className="py-2 rounded-lg text-xs font-medium"
              style={{ background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3347' }}>
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="mx-3 my-1" style={{ height: '1px', background: '#2a3347' }} />

      {/* PTZ Quick Controls */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>PTZ Kamera</span>
          <button className="text-[10px] px-2 py-0.5 rounded"
            style={{ background: '#1e2535', color: '#3b82f6', border: '1px solid #2a3347' }}>
            + Tambah
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {['Wide Shot', 'Podium', 'Worship', 'Dekat', 'Kanan', 'Kiri'].map((name, i) => (
            <button key={i} className="py-2 rounded-lg text-[10px] font-medium text-center"
              style={{ background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3347' }}>
              <div className="text-[8px] mb-0.5" style={{ color: '#374151' }}>P{i + 1}</div>
              {name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 w-24 mx-auto">
          {[
            { label: '', dir: null },{ label: '▲', dir: 'up' },{ label: '', dir: null },
            { label: '◄', dir: 'left' },{ label: '⌂', dir: 'home' },{ label: '►', dir: 'right' },
            { label: '', dir: null },{ label: '▼', dir: 'down' },{ label: '', dir: null },
          ].map((btn, i) => (
            <div key={i} className="aspect-square flex items-center justify-center">
              {btn.label && (
                <button className="w-full h-full rounded text-xs font-bold"
                  style={{ background: '#1e2535', color: '#64748b', border: '1px solid #2a3347' }}>
                  {btn.label}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-3 my-1" style={{ height: '1px', background: '#2a3347' }} />

      {/* Connections */}
      <div className="p-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest block mb-2" style={{ color: '#475569' }}>
          Koneksi
        </span>
        <div className="space-y-1.5">
          {[{ name: 'EasyBible (Mobile)', connected: false }, { name: 'OBS Studio', connected: false }, { name: 'Stage Monitor', connected: false }].map(item => (
            <div key={item.name} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: '#161b27' }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.connected ? '#22c55e' : '#374151' }} />
              <span className="text-[10px]" style={{ color: '#475569' }}>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
