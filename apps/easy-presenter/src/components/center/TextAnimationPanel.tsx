'use client'

import { useState } from 'react'
import { SlideCanvas } from '../shared/SlideCanvas'
import { DEFAULT_TEXT_ANIMATION, animGroupKey, resolveTextStyle } from '../types'
import type {
  ServiceItem, Slide, SlideBackground, TextAnimation,
  TextEnterEffect, TextLoopEffect, TextAnimUnit,
} from '../types'
import { groupColor } from '../left/AddSongModal'

const ENTER_OPTIONS: { id: TextEnterEffect; label: string }[] = [
  { id: 'none',       label: 'Tidak ada' },
  { id: 'fade',       label: 'Fade' },
  { id: 'zoom-in',    label: 'Zoom In' },
  { id: 'zoom-out',   label: 'Zoom Out' },
  { id: 'slide-up',   label: 'Slide ↑' },
  { id: 'slide-down', label: 'Slide ↓' },
  { id: 'blur',       label: 'Blur' },
  { id: 'bounce',     label: 'Bounce' },
  { id: 'pop',        label: 'Pop' },
  { id: 'flip',       label: 'Flip' },
  { id: 'type',       label: 'Ketik' },
]

const LOOP_OPTIONS: { id: TextLoopEffect; label: string }[] = [
  { id: 'none',    label: 'Tidak ada' },
  { id: 'pulse',   label: 'Pulse' },
  { id: 'glow',    label: 'Glow' },
  { id: 'neon',    label: 'Neon' },
  { id: 'float',   label: 'Float / Wave' },
  { id: 'bounce',  label: 'Bounce' },
  { id: 'breathe', label: 'Breathe' },
]

const UNIT_OPTIONS: { id: TextAnimUnit; label: string }[] = [
  { id: 'slide', label: 'Slide' },
  { id: 'line',  label: 'Baris' },
  { id: 'word',  label: 'Kata' },
  { id: 'char',  label: 'Huruf' },
]

const PRESETS: { name: string; anim: Partial<TextAnimation> }[] = [
  { name: 'Smooth',       anim: { enter: 'fade',     loop: 'none',  unit: 'line', duration: 700, stagger: 150 } },
  { name: 'Worship Glow', anim: { enter: 'blur',     loop: 'glow',  unit: 'word', duration: 700, stagger: 80, loopSpeed: 3 } },
  { name: 'Neon Night',   anim: { enter: 'fade',     loop: 'neon',  unit: 'slide', duration: 500, loopSpeed: 4, glowColor: '#e879f9' } },
  { name: 'Karaoke Pop',  anim: { enter: 'pop',      loop: 'none',  unit: 'char', duration: 400, stagger: 25 } },
  { name: 'Wave',         anim: { enter: 'slide-up', loop: 'float', unit: 'char', duration: 500, stagger: 40, loopSpeed: 2 } },
  { name: 'Mesin Ketik',  anim: { enter: 'type',     loop: 'none',  unit: 'char', duration: 60,  stagger: 45 } },
]

interface Props {
  item: ServiceItem
  activeSlide: Slide | null
  background: SlideBackground
  onChangeDefault: (anim: TextAnimation) => void
  onChangeGroup: (group: string, anim: TextAnimation | null) => void
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] px-2 py-0.5 rounded flex-shrink-0 transition-colors"
      style={{
        background: active ? '#1d4ed8' : '#1e2535',
        color:      '#ffffff',
        border:     `1px solid ${active ? '#2563eb' : '#2a3347'}`,
      }}
    >{children}</button>
  )
}

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string
  onChange: (v: number) => void
}) {
  return (
    <label className="flex items-center gap-1.5 flex-shrink-0">
      <span className="text-[10px]" style={{ color: '#94a3b8' }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} style={{ width: 80 }} />
      <span className="text-[10px] font-mono w-11" style={{ color: '#e2e8f0' }}>{value}{unit}</span>
    </label>
  )
}

export function TextAnimationPanel({ item, activeSlide, background, onChangeDefault, onChangeGroup }: Props) {
  // null = "Semua slide" (item default); otherwise a group key like "Verse" / "Chorus"
  const [target, setTarget] = useState<string | null>(null)
  const [replay, setReplay] = useState(0)

  const groups      = Array.from(new Set(item.slides.map(s => animGroupKey(s.label))))
  const groupTarget = target && groups.includes(target) ? target : null
  const defaultAnim = item.textStyle.animation ?? DEFAULT_TEXT_ANIMATION
  const groupAnim   = groupTarget ? item.groupAnimations?.[groupTarget] : undefined
  const anim        = groupAnim ?? defaultAnim
  const inherits    = !!groupTarget && !groupAnim

  const onChange = (next: TextAnimation) =>
    groupTarget ? onChangeGroup(groupTarget, next) : onChangeDefault(next)
  const set = (patch: Partial<TextAnimation>) => onChange({ ...anim, ...patch })
  const isActive = anim.enter !== 'none' || anim.loop !== 'none'

  // Preview a slide from the edited group (prefer the selected slide when it belongs to it)
  const previewSlide = groupTarget
    ? (activeSlide && animGroupKey(activeSlide.label) === groupTarget
        ? activeSlide
        : item.slides.find(s => animGroupKey(s.label) === groupTarget) ?? null)
    : activeSlide
  const previewStyle = { ...resolveTextStyle(item, previewSlide), animation: anim }

  return (
    <div className="flex flex-col min-h-0 overflow-hidden" style={{ flex: '20 1 0' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-7 flex-shrink-0"
        style={{ background: '#161b27', borderBottom: '1px solid #2a3347', borderTop: '1px solid #2a3347' }}>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#ffffff' }}>Animasi Teks</span>
        <span className="text-[10px]" style={{ color: '#94a3b8' }}>per</span>
        <div className="flex gap-0.5">
          {UNIT_OPTIONS.map(u => (
            <Chip key={u.id} active={anim.unit === u.id} onClick={() => set({ unit: u.id })}>{u.label}</Chip>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-[10px]" style={{ color: '#94a3b8' }}>Preset:</span>
        <div className="flex gap-0.5 overflow-x-auto">
          {PRESETS.map(p => (
            <button key={p.name}
              onClick={() => onChange({ ...DEFAULT_TEXT_ANIMATION, glowColor: anim.glowColor, ...p.anim })}
              className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: '#2e1065', color: '#ffffff', border: '1px solid #6d28d9' }}
            >{p.name}</button>
          ))}
        </div>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ background: groupTarget ? groupColor(groupTarget) : '#1e2535', color: '#ffffff' }}>
          Edit: {groupTarget ?? 'Semua slide'}
        </span>
        <button
          onClick={() => onChange({ ...DEFAULT_TEXT_ANIMATION })}
          disabled={!isActive}
          className="text-[10px] px-2 py-0.5 rounded flex-shrink-0"
          style={{ background: '#1e2535', border: '1px solid #2a3347', color: isActive ? '#fca5a5' : '#475569' }}
        >✕ Matikan</button>
      </div>

      {/* Body: controls + preview */}
      <div className="flex-1 flex gap-3 px-3 py-2 min-h-0">
        <div className="flex-1 min-w-0 overflow-y-auto space-y-1.5">
          {/* Target: all slides or one group */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] w-10 flex-shrink-0" style={{ color: '#94a3b8' }}>Untuk</span>
            <Chip active={!groupTarget} onClick={() => setTarget(null)}>Semua slide</Chip>
            {groups.map(g => {
              const color  = groupColor(g)
              const custom = !!item.groupAnimations?.[g]
              const active = groupTarget === g
              return (
                <button key={g}
                  onClick={() => setTarget(g)}
                  title={custom ? `${g} punya animasi sendiri` : `${g} ikut animasi Semua slide`}
                  className="text-[10px] px-2 py-0.5 rounded flex-shrink-0 font-semibold"
                  style={{
                    background: active ? color : `${color}22`,
                    color:      '#ffffff',
                    border:     `1px solid ${active ? '#ffffff' : `${color}88`}`,
                  }}
                >{custom ? '✨ ' : ''}{g}</button>
              )
            })}
            {groupTarget && (
              inherits ? (
                <span className="text-[10px] ml-1" style={{ color: '#94a3b8' }}>
                  — ikut "Semua slide", ubah apa saja untuk membuat animasi khusus {groupTarget}
                </span>
              ) : (
                <button
                  onClick={() => onChangeGroup(groupTarget, null)}
                  className="text-[10px] px-2 py-0.5 rounded flex-shrink-0 ml-1"
                  style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#fbbf24' }}
                >↺ Ikut Semua slide</button>
              )
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] w-10 flex-shrink-0" style={{ color: '#94a3b8' }}>Masuk</span>
            {ENTER_OPTIONS.map(o => (
              <Chip key={o.id} active={anim.enter === o.id} onClick={() => set({ enter: o.id })}>{o.label}</Chip>
            ))}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] w-10 flex-shrink-0" style={{ color: '#94a3b8' }}>Loop</span>
            {LOOP_OPTIONS.map(o => (
              <Chip key={o.id} active={anim.loop === o.id} onClick={() => set({ loop: o.id })}>{o.label}</Chip>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {anim.enter !== 'none' && (
              <Slider label="Durasi" value={anim.duration} min={50} max={2000} step={50} unit="ms"
                onChange={v => set({ duration: v })} />
            )}
            {anim.unit !== 'slide' && (
              <Slider label="Jeda" value={anim.stagger} min={0} max={400} step={5} unit="ms"
                onChange={v => set({ stagger: v })} />
            )}
            {anim.loop !== 'none' && (
              <Slider label="Loop" value={anim.loopSpeed} min={0.5} max={8} step={0.5} unit="s"
                onChange={v => set({ loopSpeed: v })} />
            )}
            {(anim.loop === 'glow' || anim.loop === 'neon') && (
              <label className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px]" style={{ color: '#94a3b8' }}>Warna glow</span>
                <input type="color" value={anim.glowColor}
                  onChange={e => set({ glowColor: e.target.value })}
                  className="w-7 h-5 rounded cursor-pointer p-0"
                  style={{ background: '#1e2535', border: '1px solid #2a3347' }} />
              </label>
            )}
          </div>
        </div>

        {/* Live preview — click to replay */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0 h-full min-h-0">
          <button
            onClick={() => setReplay(r => r + 1)}
            title="Klik untuk putar ulang"
            className="relative rounded-md overflow-hidden flex-1 min-h-0"
            style={{ aspectRatio: '16 / 9', border: '1px solid #2a3347', maxWidth: 260 }}
          >
            <div key={replay} className="absolute inset-0">
              <SlideCanvas text={previewSlide?.text ?? ''} background={background}
                textStyle={previewStyle} containerWidth={200} animate />
            </div>
          </button>
          <span className="text-[9px] flex-shrink-0" style={{ color: '#94a3b8' }}>↻ klik preview untuk ulang</span>
        </div>
      </div>
    </div>
  )
}
