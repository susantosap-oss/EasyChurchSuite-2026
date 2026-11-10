'use client'

import type {
  SlideBackground, TextStyle,
  AnimatedBgType, VerticalPosition, TextAlignMode,
} from '../types'

const SOLID_PRESETS = [
  '#0a0f1a', '#000000', '#0f172a', '#1e0a3c', '#0a1a0a',
  '#1a0800', '#1a001a', '#001a1a', '#1a1a00', '#1a0a0a',
]

const GRADIENT_PRESETS: { name: string; value: string }[] = [
  { name: 'Deep Space',   value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' },
  { name: 'Midnight',     value: 'linear-gradient(135deg, #0d1117 0%, #161b27 50%, #0d1b2a 100%)' },
  { name: 'Purple Night', value: 'linear-gradient(135deg, #1e0a3c 0%, #0a0a2e 100%)' },
  { name: 'Forest',       value: 'linear-gradient(135deg, #052e16 0%, #0a1a0a 100%)' },
  { name: 'Deep Red',     value: 'linear-gradient(135deg, #1a0a0a 0%, #3d0000 100%)' },
  { name: 'Ocean',        value: 'linear-gradient(135deg, #001a2e 0%, #003d5c 100%)' },
  { name: 'Dusk',         value: 'linear-gradient(135deg, #2d1b4e 0%, #0f1117 50%, #1a0a2e 100%)' },
  { name: 'Sunrise',      value: 'linear-gradient(135deg, #1a0a00 0%, #3d1a00 50%, #1a1a0a 100%)' },
]

const ANIMATED_PRESETS: { id: AnimatedBgType; name: string }[] = [
  { id: 'gradient-pulse', name: 'Deep Pulse' },
  { id: 'aurora',         name: 'Aurora' },
  { id: 'worship',        name: 'Worship' },
  { id: 'fire',           name: 'Fire' },
]

const FONTS = [
  { label: 'Inter (Default)',  value: 'Inter, sans-serif' },
  { label: 'Arial',            value: 'Arial, sans-serif' },
  { label: 'Segoe UI',         value: "'Segoe UI', sans-serif" },
  { label: 'Trebuchet MS',     value: "'Trebuchet MS', sans-serif" },
  { label: 'Georgia',          value: 'Georgia, serif' },
  { label: 'Times New Roman',  value: "'Times New Roman', serif" },
  { label: 'Impact',           value: 'Impact, fantasy' },
  { label: 'Courier New',      value: "'Courier New', monospace" },
]

const V_POSITIONS: { id: VerticalPosition; label: string }[] = [
  { id: 'top',    label: 'Paling Atas' },
  { id: 'upper',  label: 'Atas Tengah' },
  { id: 'center', label: 'Tengah' },
  { id: 'lower',  label: 'Bawah Tengah' },
  { id: 'bottom', label: 'Paling Bawah' },
]

interface Props {
  background: SlideBackground
  textStyle: TextStyle
  onUpdateBackground: (bg: SlideBackground) => void
  onUpdateTextStyle: (style: Partial<TextStyle>) => void
}

function SL({ children }: { children: string }) {
  return (
    <div className="px-3 py-1.5 flex-shrink-0 sticky top-0 z-10"
      style={{ background: '#161b27', borderBottom: '1px solid #2a3347' }}>
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
        {children}
      </span>
    </div>
  )
}

export function FormatPanel({ background, textStyle, onUpdateBackground, onUpdateTextStyle }: Props) {
  const bgType = background.type
  const hasEdgeOffset = ['top','upper','lower','bottom'].includes(textStyle.verticalPosition)

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ fontSize: 11 }}>

      {/* ── BACKGROUND ── */}
      <SL>Background</SL>
      <div className="p-3 space-y-3">

        {/* Type tabs — 5 types */}
        <div className="grid grid-cols-5 gap-1">
          {(['solid', 'gradient', 'image', 'video', 'animated'] as const).map(t => (
            <button
              key={t}
              onClick={() => onUpdateBackground({ ...background, type: t })}
              className="py-1 rounded text-[9px] font-medium capitalize transition-all"
              style={{
                background: bgType === t ? '#1d4ed8' : '#1e2535',
                color:      bgType === t ? '#fff'    : '#64748b',
                border:     `1px solid ${bgType === t ? '#1d4ed8' : '#2a3347'}`,
              }}
            >
              {t === 'gradient' ? 'Grad.' : t === 'animated' ? 'Anim.' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Solid */}
        {bgType === 'solid' && (
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-1.5">
              {SOLID_PRESETS.map(c => (
                <button key={c} onClick={() => onUpdateBackground({ ...background, color: c })}
                  style={{ background: c, aspectRatio: '1', borderRadius: 6,
                    border: background.color === c ? '2px solid #3b82f6' : '1px solid #2a3347' }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={background.color ?? '#0a0f1a'}
                onChange={e => onUpdateBackground({ ...background, color: e.target.value })}
                className="w-8 h-7 rounded cursor-pointer p-0.5"
                style={{ background: '#1e2535', border: '1px solid #2a3347' }} />
              <input type="text" value={background.color ?? '#0a0f1a'}
                onChange={e => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) &&
                  onUpdateBackground({ ...background, color: e.target.value })}
                className="flex-1 px-2 py-1 rounded font-mono focus:outline-none"
                style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#e2e8f0' }} />
            </div>
          </div>
        )}

        {/* Gradient */}
        {bgType === 'gradient' && (
          <div className="grid grid-cols-2 gap-1.5">
            {GRADIENT_PRESETS.map(g => (
              <button key={g.name} onClick={() => onUpdateBackground({ ...background, gradient: g.value })}
                className="rounded-lg overflow-hidden text-left"
                style={{ border: background.gradient === g.value ? '2px solid #3b82f6' : '1px solid #2a3347' }}>
                <div style={{ background: g.value, height: 28 }} />
                <div className="px-1.5 py-1" style={{ background: '#161b27' }}>
                  <span className="text-[9px]" style={{ color: '#64748b' }}>{g.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Image */}
        {bgType === 'image' && (
          <div className="space-y-2">
            <label className="flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer"
              style={{ background: '#1e2535', border: '1px dashed #2a3347', color: '#64748b' }}>
              Pilih Gambar (JPG/PNG/WEBP)
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) onUpdateBackground({ ...background, imageUrl: URL.createObjectURL(f) })
                }} />
            </label>
            {background.imageUrl && (
              <div className="relative rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={background.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              </div>
            )}
            <OverlaySlider value={background.imageOverlayOpacity ?? 0.4}
              onChange={v => onUpdateBackground({ ...background, imageOverlayOpacity: v })} />
          </div>
        )}

        {/* Video */}
        {bgType === 'video' && (
          <div className="space-y-2">
            <label className="flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer"
              style={{ background: '#1e2535', border: '1px dashed #2a3347', color: '#64748b' }}>
              Pilih Video (MP4, WebM, AVI, MPG)
              <input type="file" accept="video/*" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) onUpdateBackground({ ...background, videoUrl: URL.createObjectURL(f) })
                }} />
            </label>
            {background.videoUrl && (
              <video src={background.videoUrl} autoPlay loop muted playsInline
                className="w-full rounded-lg"
                style={{ maxHeight: 90, objectFit: 'cover' }} />
            )}
            <OverlaySlider value={background.imageOverlayOpacity ?? 0.3}
              onChange={v => onUpdateBackground({ ...background, imageOverlayOpacity: v })} />
            <p className="text-[9px]" style={{ color: '#374151' }}>
              Loop otomatis · Didukung: MP4 (H.264), WebM, format yang di-support Chromium
            </p>
          </div>
        )}

        {/* Animated */}
        {bgType === 'animated' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              {ANIMATED_PRESETS.map(a => (
                <button key={a.id} onClick={() => onUpdateBackground({ ...background, animated: a.id })}
                  className="rounded-lg overflow-hidden text-left"
                  style={{ border: background.animated === a.id ? '2px solid #3b82f6' : '1px solid #2a3347' }}>
                  <div className={`slide-bg-${a.id}`} style={{ height: 28 }} />
                  <div className="px-1.5 py-1" style={{ background: '#161b27' }}>
                    <span className="text-[9px]" style={{ color: background.animated === a.id ? '#93c5fd' : '#64748b' }}>
                      {a.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom animated upload */}
            <label
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg cursor-pointer"
              style={{
                background: background.animated === 'custom' ? '#1e2535' : 'transparent',
                border: `1px ${background.animated === 'custom' ? 'solid #3b82f6' : 'dashed #2a3347'}`,
                color: background.animated === 'custom' ? '#93c5fd' : '#64748b',
              }}>
              <span className="text-sm font-bold leading-none">+</span>
              <span className="text-[9px]">Upload Custom (MP4/WebM/GIF)</span>
              <input type="file" accept="video/*,.gif,image/gif" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) onUpdateBackground({
                    ...background,
                    animated: 'custom',
                    animatedCustomUrl: URL.createObjectURL(f),
                    animatedCustomType: f.type === 'image/gif' ? 'gif' : 'video',
                  })
                }} />
            </label>

            {background.animated === 'custom' && background.animatedCustomUrl && (
              <>
                {background.animatedCustomType === 'gif' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={background.animatedCustomUrl} alt="custom bg preview"
                    className="w-full rounded-lg" style={{ maxHeight: 80, objectFit: 'cover' }} />
                ) : (
                  <video src={background.animatedCustomUrl} autoPlay loop muted playsInline
                    className="w-full rounded-lg" style={{ maxHeight: 80, objectFit: 'cover' }} />
                )}
                <OverlaySlider value={background.imageOverlayOpacity ?? 0.0}
                  onChange={v => onUpdateBackground({ ...background, imageOverlayOpacity: v })} />
              </>
            )}
          </div>
        )}
      </div>

      {/* ── TEXT STYLE ── */}
      <SL>Teks</SL>
      <div className="p-3 space-y-3">

        {/* Font */}
        <div>
          <label className="block text-[10px] mb-1" style={{ color: '#475569' }}>Font</label>
          <select value={textStyle.fontFamily}
            onChange={e => onUpdateTextStyle({ fontFamily: e.target.value })}
            className="w-full px-2 py-1.5 rounded-lg focus:outline-none"
            style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#e2e8f0', fontSize: 11 }}>
            {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        {/* Size + Bold + Color */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[10px] mb-1" style={{ color: '#475569' }}>Ukuran (px)</label>
            <input type="number" min={12} max={300} value={textStyle.fontSize}
              onChange={e => onUpdateTextStyle({ fontSize: Math.max(12, Math.min(300, Number(e.target.value))) })}
              className="w-full px-2 py-1.5 rounded-lg font-mono text-center focus:outline-none"
              style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#e2e8f0', fontSize: 11 }} />
          </div>
          <div>
            <label className="block text-[10px] mb-1" style={{ color: '#475569' }}>Tebal</label>
            <button
              onClick={() => onUpdateTextStyle({ fontWeight: textStyle.fontWeight === 'bold' ? 'normal' : 'bold' })}
              className="w-10 py-1.5 rounded-lg font-bold transition-all"
              style={{
                background: textStyle.fontWeight === 'bold' ? '#1d4ed8' : '#1e2535',
                color:      textStyle.fontWeight === 'bold' ? '#fff'    : '#64748b',
                border:     `1px solid ${textStyle.fontWeight === 'bold' ? '#1d4ed8' : '#2a3347'}`,
                fontSize: 12,
              }}>B</button>
          </div>
          <div>
            <label className="block text-[10px] mb-1" style={{ color: '#475569' }}>Warna</label>
            <input type="color" value={textStyle.color}
              onChange={e => onUpdateTextStyle({ color: e.target.value })}
              className="w-10 h-8 rounded-lg cursor-pointer p-0.5"
              style={{ background: '#1e2535', border: '1px solid #2a3347' }} />
          </div>
        </div>
        <input type="range" min={12} max={300} step={2} value={textStyle.fontSize}
          onChange={e => onUpdateTextStyle({ fontSize: Number(e.target.value) })}
          className="w-full" />

        {/* Text align */}
        <div>
          <label className="block text-[10px] mb-1" style={{ color: '#475569' }}>Rata Teks</label>
          <div className="grid grid-cols-3 gap-1">
            {(['left', 'center', 'right'] as TextAlignMode[]).map(a => (
              <button key={a} onClick={() => onUpdateTextStyle({ textAlign: a })}
                className="py-1.5 rounded-lg transition-all"
                style={{
                  background: textStyle.textAlign === a ? '#1d4ed8' : '#1e2535',
                  color:      textStyle.textAlign === a ? '#fff'    : '#64748b',
                  border:     `1px solid ${textStyle.textAlign === a ? '#1d4ed8' : '#2a3347'}`,
                  fontSize: 11,
                }}>
                {a === 'left' ? 'Kiri' : a === 'center' ? 'Tengah' : 'Kanan'}
              </button>
            ))}
          </div>
        </div>

        {/* Vertical position */}
        <div>
          <label className="block text-[10px] mb-1" style={{ color: '#475569' }}>Posisi Vertikal</label>
          <div className="space-y-0.5">
            {V_POSITIONS.map(p => (
              <button key={p.id} onClick={() => onUpdateTextStyle({ verticalPosition: p.id })}
                className="w-full py-1 rounded text-left px-2.5 transition-all"
                style={{
                  background: textStyle.verticalPosition === p.id ? '#1e2535' : 'transparent',
                  color:      textStyle.verticalPosition === p.id ? '#93c5fd' : '#64748b',
                  border:     `1px solid ${textStyle.verticalPosition === p.id ? '#2a3347' : 'transparent'}`,
                  fontSize: 11,
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Position offset — only for top/upper/lower/bottom */}
        {hasEdgeOffset && (() => {
          const isBottom = ['bottom','lower'].includes(textStyle.verticalPosition)
          const minVal = isBottom ? -200 : 0
          return (
            <div>
              <div className="flex justify-between mb-0.5">
                <label className="text-[10px]" style={{ color: '#475569' }}>
                  Offset {['top','upper'].includes(textStyle.verticalPosition) ? 'dari Atas' : 'dari Bawah'} (px)
                </label>
                <span style={{ color: '#94a3b8' }}>{textStyle.positionOffset}px</span>
              </div>
              <input type="range" min={minVal} max={300} step={4}
                value={textStyle.positionOffset}
                onChange={e => onUpdateTextStyle({ positionOffset: Number(e.target.value) })}
                className="w-full" />
              <input type="number" min={minVal} max={500} value={textStyle.positionOffset}
                onChange={e => onUpdateTextStyle({ positionOffset: Math.max(minVal, Number(e.target.value)) })}
                className="w-full mt-1 px-2 py-1 rounded font-mono text-center focus:outline-none"
                style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#e2e8f0', fontSize: 11 }} />
              {isBottom && (
                <p className="text-[9px] mt-0.5" style={{ color: '#374151' }}>
                  Nilai negatif → teks lebih dekat ke tepi bawah
                </p>
              )}
            </div>
          )
        })()}

        {/* Shadow + Outline */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onUpdateTextStyle({ shadow: !textStyle.shadow })}
            className="py-1.5 rounded-lg transition-all"
            style={{
              background: textStyle.shadow ? '#1e2535' : 'transparent',
              color:      textStyle.shadow ? '#93c5fd' : '#475569',
              border:     `1px solid ${textStyle.shadow ? '#2a3347' : '#1e2535'}`,
              fontSize: 11,
            }}>Shadow</button>
          <button onClick={() => onUpdateTextStyle({ outline: !textStyle.outline })}
            className="py-1.5 rounded-lg transition-all"
            style={{
              background: textStyle.outline ? '#1e2535' : 'transparent',
              color:      textStyle.outline ? '#93c5fd' : '#475569',
              border:     `1px solid ${textStyle.outline ? '#2a3347' : '#1e2535'}`,
              fontSize: 11,
            }}>Outline</button>
        </div>
        {textStyle.outline && (
          <div className="flex items-center gap-2">
            <span style={{ color: '#475569' }}>Warna Outline</span>
            <input type="color" value={textStyle.outlineColor}
              onChange={e => onUpdateTextStyle({ outlineColor: e.target.value })}
              className="w-8 h-7 rounded cursor-pointer p-0.5"
              style={{ background: '#1e2535', border: '1px solid #2a3347' }} />
          </div>
        )}

        {/* Line height */}
        <div>
          <div className="flex justify-between mb-0.5">
            <label className="text-[10px]" style={{ color: '#475569' }}>Jarak Baris</label>
            <span style={{ color: '#94a3b8' }}>{textStyle.lineHeight.toFixed(1)}x</span>
          </div>
          <input type="range" min={10} max={30} step={1}
            value={Math.round(textStyle.lineHeight * 10)}
            onChange={e => onUpdateTextStyle({ lineHeight: Number(e.target.value) / 10 })}
            className="w-full" />
        </div>
      </div>
    </div>
  )
}

function OverlaySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span style={{ color: '#64748b' }}>Overlay Gelap</span>
        <span style={{ color: '#94a3b8' }}>{Math.round(value * 100)}%</span>
      </div>
      <input type="range" min={0} max={100} step={5}
        value={Math.round(value * 100)}
        onChange={e => onChange(Number(e.target.value) / 100)}
        className="w-full" />
    </div>
  )
}
