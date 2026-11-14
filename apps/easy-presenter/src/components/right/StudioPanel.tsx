'use client'

import { useState } from 'react'
import type { Slide } from '../types'
import type { RunningText } from '@/lib/outputBus'

interface Props {
  liveSlide?: Slide | null
  runningText: RunningText | null
  onRunningText: (rt: RunningText | null) => void
}

const SPEEDS = [
  { label: 'Lambat', value: 0.08 },
  { label: 'Sedang', value: 0.14 },
  { label: 'Cepat',  value: 0.22 },
] as const

export function StudioPanel({ liveSlide, runningText, onRunningText }: Props) {
  // Draft survives tab switches because it starts from what is on air
  const [text, setText]           = useState(runningText?.text ?? '')
  const [direction, setDirection] = useState<RunningText['direction']>(runningText?.direction ?? 'ltr')
  const [speed, setSpeed]         = useState<number>(runningText?.speed ?? SPEEDS[1].value)
  const isOnAir = runningText != null

  const push = (patch: Partial<RunningText> = {}) => {
    const next = { text: text.trim(), direction, speed, ...patch }
    if (next.text) onRunningText(next)
  }
  // Direction / speed changes apply straight away while the ticker is on air
  const changeDirection = (d: RunningText['direction']) => { setDirection(d); if (isOnAir) push({ direction: d }) }
  const changeSpeed     = (v: number) => { setSpeed(v); if (isOnAir) push({ speed: v }) }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">

      {/* Stage Monitor mini */}
      <div className="p-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest block mb-2" style={{ color: '#ffffff' }}>
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

      {/* Running Text */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#ffffff' }}>
            Running Text
          </span>
          {isOnAir && (
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#dc2626', color: 'white' }}>LIVE</span>
          )}
        </div>
        <div className="space-y-2">
          <textarea value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); push() } }}
            rows={2}
            placeholder="Selamat datang di ibadah raya · Persekutuan Pemuda Sabtu pkl 17.00"
            className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none resize-none"
            style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#e2e8f0' }} />

          <div className="flex items-center gap-2">
            <span className="text-[10px] w-12" style={{ color: '#475569' }}>Arah</span>
            {([['ltr', 'Kiri → Kanan'], ['rtl', 'Kanan → Kiri']] as const).map(([d, label]) => (
              <button key={d} onClick={() => changeDirection(d)}
                className="flex-1 py-1 rounded text-[10px] font-medium"
                style={{
                  background: direction === d ? '#1d4ed8' : '#1e2535',
                  color:      direction === d ? 'white' : '#94a3b8',
                  border:     '1px solid #2a3347',
                }}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] w-12" style={{ color: '#475569' }}>Speed</span>
            {SPEEDS.map(sp => (
              <button key={sp.label} onClick={() => changeSpeed(sp.value)}
                className="flex-1 py-1 rounded text-[10px] font-medium"
                style={{
                  background: speed === sp.value ? '#1d4ed8' : '#1e2535',
                  color:      speed === sp.value ? 'white' : '#94a3b8',
                  border:     '1px solid #2a3347',
                }}>
                {sp.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={() => push()} disabled={!text.trim()}
              className="py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
              style={{ background: '#1d4ed8', color: 'white' }}>
              {isOnAir ? 'Update' : 'Push Live'}
            </button>
            <button onClick={() => onRunningText(null)} disabled={!isOnAir}
              className="py-2 rounded-lg text-xs font-medium disabled:opacity-40"
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
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#ffffff' }}>PTZ Kamera</span>
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
        <span className="text-[10px] font-semibold uppercase tracking-widest block mb-2" style={{ color: '#ffffff' }}>
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
