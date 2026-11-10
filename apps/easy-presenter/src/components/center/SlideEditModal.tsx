'use client'

import { useState, useEffect } from 'react'
import type { Slide, ServiceItem, SlideBackground, TextStyle, VerticalPosition, TextAlignMode } from '../types'
import { DEFAULT_SCRIPTURE_BG, DEFAULT_TEXT_STYLE } from '../types'

const FONTS = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Segoe UI', value: "'Segoe UI', sans-serif" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Impact', value: 'Impact, fantasy' },
  { label: 'Courier New', value: "'Courier New', monospace" },
]

const V_POSITIONS: { id: VerticalPosition; label: string }[] = [
  { id: 'top', label: 'Paling Atas' },
  { id: 'upper', label: 'Atas Tengah' },
  { id: 'center', label: 'Tengah' },
  { id: 'lower', label: 'Bawah Tengah' },
  { id: 'bottom', label: 'Paling Bawah' },
]

interface Props {
  slide: Slide
  item: ServiceItem
  onSave: (slideId: string, updates: Partial<Slide>) => void
  onClose: () => void
}

export function SlideEditModal({ slide, item, onSave, onClose }: Props) {
  const [label, setLabel]   = useState(slide.label)
  const [text, setText]     = useState(slide.text)
  const [note, setNote]     = useState(slide.note ?? '')

  // Background override
  const [useBgOverride, setUseBgOverride] = useState(!!slide.backgroundOverride)
  const [bgOverride, setBgOverride]       = useState<SlideBackground>(
    slide.backgroundOverride ?? item.background ?? DEFAULT_SCRIPTURE_BG
  )

  // Text style override (only font, size, color, align, position, offset)
  const [useStyleOverride, setUseStyleOverride] = useState(!!slide.textStyleOverride)
  const baseStyle = { ...DEFAULT_TEXT_STYLE, ...item.textStyle }
  const [styleOverride, setStyleOverride] = useState<Partial<TextStyle>>(
    slide.textStyleOverride ?? {}
  )

  // Merge for preview
  const effectiveStyle: TextStyle = { ...baseStyle, ...(useStyleOverride ? styleOverride : {}) }

  useEffect(() => {
    setLabel(slide.label)
    setText(slide.text)
    setNote(slide.note ?? '')
    setUseBgOverride(!!slide.backgroundOverride)
    setBgOverride(slide.backgroundOverride ?? item.background ?? DEFAULT_SCRIPTURE_BG)
    setUseStyleOverride(!!slide.textStyleOverride)
    setStyleOverride(slide.textStyleOverride ?? {})
  }, [slide.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    onSave(slide.id, {
      label,
      text,
      note: note || undefined,
      backgroundOverride: useBgOverride ? bgOverride : undefined,
      textStyleOverride:  useStyleOverride ? styleOverride : undefined,
    })
    onClose()
  }

  const patchStyle = (patch: Partial<TextStyle>) =>
    setStyleOverride(prev => ({ ...prev, ...patch }))

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', zIndex: 100 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: 560, maxHeight: 'calc(100vh - 80px)',
          background: '#161b27', border: '1px solid #2a3347',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ background: '#0f1117', borderBottom: '1px solid #2a3347' }}>
          <span className="text-sm font-bold" style={{ color: '#f1f5f9' }}>Edit Slide</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Label + Note row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#475569' }}>
                Label / Judul Slide
              </label>
              <input value={label} onChange={e => setLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#f1f5f9' }} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#475569' }}>
                Catatan (Stage Monitor)
              </label>
              <input value={note} onChange={e => setNote(e.target.value)}
                placeholder="Catatan untuk presenter..."
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#f1f5f9' }} />
            </div>
          </div>

          {/* Text content */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#475569' }}>
              Teks Slide
            </label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
              style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#f1f5f9', lineHeight: 1.6 }} />
          </div>

          {/* Background override */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a3347' }}>
            <label className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
              style={{ background: '#1e2535' }}>
              <input type="checkbox" checked={useBgOverride} onChange={e => setUseBgOverride(e.target.checked)}
                className="w-4 h-4 rounded" />
              <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
                Override Background untuk Slide Ini
              </span>
            </label>

            {useBgOverride && (
              <div className="p-4 space-y-3" style={{ background: '#161b27' }}>
                {/* BG type tabs */}
                <div className="grid grid-cols-5 gap-1">
                  {(['solid','gradient','image','video','animated'] as SlideBackground['type'][]).map(t => (
                    <button key={t}
                      onClick={() => setBgOverride({ ...bgOverride, type: t })}
                      className="py-1 rounded text-[9px] transition-all"
                      style={{
                        background: bgOverride.type === t ? '#1d4ed8' : '#1e2535',
                        color:      bgOverride.type === t ? '#fff'    : '#64748b',
                        border:     `1px solid ${bgOverride.type === t ? '#1d4ed8' : '#2a3347'}`,
                      }}>
                      {t === 'gradient' ? 'Grad.' : t === 'animated' ? 'Anim.' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {bgOverride.type === 'solid' && (
                  <div className="flex items-center gap-2">
                    <input type="color" value={bgOverride.color ?? '#0a0f1a'}
                      onChange={e => setBgOverride({ ...bgOverride, color: e.target.value })}
                      className="w-8 h-7 rounded cursor-pointer p-0.5"
                      style={{ background: '#1e2535', border: '1px solid #2a3347' }} />
                    <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{bgOverride.color ?? '#0a0f1a'}</span>
                  </div>
                )}
                {bgOverride.type === 'image' && (
                  <label className="flex items-center justify-center py-2 rounded-lg cursor-pointer text-xs"
                    style={{ background: '#1e2535', border: '1px dashed #2a3347', color: '#64748b' }}>
                    Pilih Gambar
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) setBgOverride({ ...bgOverride, imageUrl: URL.createObjectURL(f) }) }} />
                  </label>
                )}
                {bgOverride.type === 'video' && (
                  <label className="flex items-center justify-center py-2 rounded-lg cursor-pointer text-xs"
                    style={{ background: '#1e2535', border: '1px dashed #2a3347', color: '#64748b' }}>
                    Pilih Video
                    <input type="file" accept="video/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) setBgOverride({ ...bgOverride, videoUrl: URL.createObjectURL(f) }) }} />
                  </label>
                )}
                {bgOverride.type === 'animated' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['gradient-pulse','aurora','worship','fire'] as const).map(id => (
                        <button key={id} onClick={() => setBgOverride({ ...bgOverride, animated: id })}
                          className="rounded-lg overflow-hidden"
                          style={{ border: bgOverride.animated === id ? '2px solid #3b82f6' : '1px solid #2a3347' }}>
                          <div className={`slide-bg-${id}`} style={{ height: 24 }} />
                          <div className="text-[8px] text-center py-0.5" style={{ color: '#64748b' }}>{id}</div>
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg cursor-pointer"
                      style={{
                        background: bgOverride.animated === 'custom' ? '#1e2535' : 'transparent',
                        border: `1px ${bgOverride.animated === 'custom' ? 'solid #3b82f6' : 'dashed #2a3347'}`,
                        color: bgOverride.animated === 'custom' ? '#93c5fd' : '#64748b',
                        fontSize: 9,
                      }}>
                      + Custom (MP4/GIF)
                      <input type="file" accept="video/*,.gif,image/gif" className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) setBgOverride({
                            ...bgOverride, animated: 'custom',
                            animatedCustomUrl: URL.createObjectURL(f),
                            animatedCustomType: f.type === 'image/gif' ? 'gif' : 'video',
                          })
                        }} />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Text style override */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a3347' }}>
            <label className="flex items-center gap-3 px-4 py-2.5 cursor-pointer" style={{ background: '#1e2535' }}>
              <input type="checkbox" checked={useStyleOverride} onChange={e => setUseStyleOverride(e.target.checked)}
                className="w-4 h-4 rounded" />
              <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
                Override Teks Style untuk Slide Ini
              </span>
            </label>

            {useStyleOverride && (
              <div className="p-4 space-y-3" style={{ background: '#161b27' }}>
                {/* Font + size + color row */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] mb-1" style={{ color: '#475569' }}>Font</label>
                    <select value={effectiveStyle.fontFamily}
                      onChange={e => patchStyle({ fontFamily: e.target.value })}
                      className="w-full px-2 py-1.5 rounded text-[11px] focus:outline-none"
                      style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#e2e8f0' }}>
                      {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] mb-1" style={{ color: '#475569' }}>Ukuran (px)</label>
                    <input type="number" min={12} max={300}
                      value={effectiveStyle.fontSize}
                      onChange={e => patchStyle({ fontSize: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 rounded font-mono text-center text-[11px] focus:outline-none"
                      style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#e2e8f0' }} />
                  </div>
                  <div>
                    <label className="block text-[9px] mb-1" style={{ color: '#475569' }}>Warna</label>
                    <input type="color" value={effectiveStyle.color}
                      onChange={e => patchStyle({ color: e.target.value })}
                      className="w-full h-9 rounded cursor-pointer p-0.5"
                      style={{ background: '#1e2535', border: '1px solid #2a3347' }} />
                  </div>
                </div>

                {/* Align buttons */}
                <div>
                  <label className="block text-[9px] mb-1" style={{ color: '#475569' }}>Rata Teks</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['left','center','right'] as TextAlignMode[]).map(a => (
                      <button key={a}
                        onClick={() => patchStyle({ textAlign: a })}
                        className="py-1 rounded text-[10px] transition-all"
                        style={{
                          background: effectiveStyle.textAlign === a ? '#1d4ed8' : '#1e2535',
                          color:      effectiveStyle.textAlign === a ? '#fff'    : '#64748b',
                          border:     `1px solid ${effectiveStyle.textAlign === a ? '#1d4ed8' : '#2a3347'}`,
                        }}>
                        {a === 'left' ? 'Kiri' : a === 'center' ? 'Tengah' : 'Kanan'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vertical position */}
                <div>
                  <label className="block text-[9px] mb-1" style={{ color: '#475569' }}>Posisi Vertikal</label>
                  <div className="grid grid-cols-5 gap-1">
                    {V_POSITIONS.map(p => (
                      <button key={p.id}
                        onClick={() => patchStyle({ verticalPosition: p.id })}
                        className="py-1 rounded text-[9px] transition-all text-center"
                        style={{
                          background: effectiveStyle.verticalPosition === p.id ? '#1d4ed8' : '#1e2535',
                          color:      effectiveStyle.verticalPosition === p.id ? '#fff'    : '#64748b',
                          border:     `1px solid ${effectiveStyle.verticalPosition === p.id ? '#1d4ed8' : '#2a3347'}`,
                        }}>
                        {p.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Offset */}
                {['top','upper','lower','bottom'].includes(effectiveStyle.verticalPosition) && (() => {
                  const isBottom = ['bottom','lower'].includes(effectiveStyle.verticalPosition)
                  const minVal = isBottom ? -200 : 0
                  return (
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <label className="text-[9px]" style={{ color: '#475569' }}>Offset Posisi (px)</label>
                        <span className="text-[9px]" style={{ color: '#94a3b8' }}>{effectiveStyle.positionOffset}px</span>
                      </div>
                      <input type="range" min={minVal} max={300} step={4}
                        value={effectiveStyle.positionOffset}
                        onChange={e => patchStyle({ positionOffset: Number(e.target.value) })}
                        className="w-full" />
                      <input type="number" min={minVal} max={500} value={effectiveStyle.positionOffset}
                        onChange={e => patchStyle({ positionOffset: Math.max(minVal, Number(e.target.value)) })}
                        className="w-full mt-1 px-2 py-1 rounded font-mono text-center text-[11px] focus:outline-none"
                        style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#e2e8f0' }} />
                    </div>
                  )
                })()}

                {/* Shadow + Bold */}
                <div className="flex gap-2">
                  <button onClick={() => patchStyle({ shadow: !effectiveStyle.shadow })}
                    className="flex-1 py-1 rounded text-[10px] transition-all"
                    style={{
                      background: effectiveStyle.shadow ? '#1e2535' : 'transparent',
                      color:      effectiveStyle.shadow ? '#93c5fd' : '#64748b',
                      border:     `1px solid ${effectiveStyle.shadow ? '#2a3347' : '#1e2535'}`,
                    }}>Shadow</button>
                  <button onClick={() => patchStyle({ fontWeight: effectiveStyle.fontWeight === 'bold' ? 'normal' : 'bold' })}
                    className="flex-1 py-1 rounded text-[10px] font-bold transition-all"
                    style={{
                      background: effectiveStyle.fontWeight === 'bold' ? '#1d4ed8' : '#1e2535',
                      color:      effectiveStyle.fontWeight === 'bold' ? '#fff'    : '#64748b',
                      border:     `1px solid ${effectiveStyle.fontWeight === 'bold' ? '#1d4ed8' : '#2a3347'}`,
                    }}>Bold</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 flex-shrink-0"
          style={{ background: '#0f1117', borderTop: '1px solid #2a3347' }}>
          <button onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#1e2535', color: '#94a3b8', border: '1px solid #2a3347' }}>
            Batal
          </button>
          <button onClick={handleSave}
            className="px-5 py-2 rounded-lg text-sm font-semibold"
            style={{ background: '#1d4ed8', color: 'white' }}>
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  )
}
