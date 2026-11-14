'use client'

import { useEffect, useState } from 'react'
import { SlideCanvas } from '../shared/SlideCanvas'
import { FontPickerModal } from '../shared/FontPickerModal'
import type { BgLibrary } from '../center/BackgroundPanels'
import type { SlideBackground } from '../types'
import type { SceneRef } from '../left/SaveSceneModal'
import {
  ANIMATION_PRESETS, presetNameOf, textSettingsToStyle, defaultTextStyle,
  type AppSettings, type DisplaySettings, type DisplayTextSettings, type TextPosition,
} from './appSettings'
import { DEFAULT_TEXT_STYLE } from '../types'

type Tab = 'teks' | 'background' | 'animasi' | 'scene' | 'output' | 'performa'

const TABS: { id: Tab; label: string }[] = [
  { id: 'teks',       label: '🔤 Teks' },
  { id: 'background', label: '🖼 Background' },
  { id: 'animasi',    label: '✨ Animasi' },
  { id: 'scene',      label: '📋 Scene' },
  { id: 'output',     label: '🖥 Output' },
  { id: 'performa',   label: '⚡ Performa' },
]

interface Props {
  settings: AppSettings
  bgLibrary: BgLibrary
  currentScene: SceneRef | null
  onSave: (s: AppSettings) => Promise<void>
  onCreateScene: (name: string, date: string | null) => Promise<void>
  onClose: () => void
}

// ── Small UI helpers ──

const C = { panel: '#0f1117', border: '#2a3347', card: '#161b27', muted: '#94a3b8', dim: '#64748b' }

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="rounded-xl p-3 space-y-2.5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#ffffff' }}>{title}</p>
        {note && <p className="text-[10px] mt-0.5" style={{ color: C.dim }}>{note}</p>}
      </div>
      {children}
    </div>
  )
}

function Seg<T extends string | number>({ value, options, onChange }: {
  value: T; options: { id: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(o => (
        <button key={String(o.id)} onClick={() => onChange(o.id)}
          className="text-[11px] px-2.5 py-1 rounded-lg"
          style={{
            background: value === o.id ? '#1d4ed8' : '#1e2535',
            color: '#ffffff',
            border: `1px solid ${value === o.id ? '#2563eb' : C.border}`,
          }}>{o.label}</button>
      ))}
    </div>
  )
}

function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button onClick={() => !disabled && onChange(!on)} disabled={disabled}
      className="flex items-center gap-2 text-[12px]" style={{ color: disabled ? C.dim : '#e2e8f0' }}>
      <span className="w-8 h-4 rounded-full relative transition-colors flex-shrink-0"
        style={{ background: on && !disabled ? '#2563eb' : '#334155' }}>
        <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all" style={{ left: on ? 18 : 2 }} />
      </span>
      {label}
    </button>
  )
}

function Preview({ text, background, style }: { text: string; background: SlideBackground; style: ReturnType<typeof defaultTextStyle> }) {
  return (
    <div className="relative rounded-lg overflow-hidden" style={{ paddingTop: '56.25%', border: `1px solid ${C.border}` }}>
      <div className="absolute inset-0">
        <SlideCanvas text={text} background={background} textStyle={style} containerWidth={300} animate />
      </div>
    </div>
  )
}

function BgThumb({ bg, active, onClick }: { bg: SlideBackground; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="relative rounded-md overflow-hidden flex-shrink-0"
      style={{ width: 96, aspectRatio: '16 / 9', border: `2px solid ${active ? '#3b82f6' : C.border}` }}>
      <div className="absolute inset-0">
        <SlideCanvas text="" background={bg} textStyle={DEFAULT_TEXT_STYLE} containerWidth={96} thumbnail />
      </div>
    </button>
  )
}

// ── Main modal ──

export function SettingsModal({ settings, bgLibrary, currentScene, onSave, onCreateScene, onClose }: Props) {
  const [tab, setTab]       = useState<Tab>('teks')
  const [draft, setDraft]   = useState<AppSettings>(settings)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState<{ ok: boolean; text: string } | null>(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)

  const patchDisplay = (n: 1 | 2, patch: Partial<DisplaySettings>) =>
    setDraft(d => ({ ...d, [`display${n}`]: { ...d[`display${n}`], ...patch } }))
  const patchText = (n: 1 | 2, patch: Partial<DisplayTextSettings>) =>
    setDraft(d => ({ ...d, [`display${n}`]: { ...d[`display${n}`], text: { ...d[`display${n}`].text, ...patch } } }))

  const handleSave = async () => {
    setSaving(true); setMsg(null)
    try {
      await onSave(draft)
      setMsg({ ok: true, text: 'Settings tersimpan. Default baru berlaku untuk lagu / ayat yang ditambahkan setelah ini.' })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Gagal menyimpan' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex flex-col rounded-2xl overflow-hidden"
        style={{ width: 'min(980px, 94vw)', height: '86vh', background: C.panel, border: `1px solid ${C.border}` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${C.border}`, background: '#1a2235' }}>
          <h2 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>⚙ Settings — Default Aplikasi</h2>
          <button onClick={onClose} className="text-lg leading-none" style={{ color: C.muted }}>×</button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Tabs */}
          <div className="w-44 flex-shrink-0 p-2 space-y-1" style={{ borderRight: `1px solid ${C.border}`, background: C.card }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium"
                style={{ background: tab === t.id ? '#1e3a5f' : 'transparent', color: '#ffffff' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tab === 'teks' && <TextTab draft={draft} patchText={patchText}
              setShowReference={v => setDraft(d => ({ ...d, scripture: { ...d.scripture, showReference: v } }))} />}
            {tab === 'background' && <BackgroundTab draft={draft} lib={bgLibrary} patchDisplay={patchDisplay} />}
            {tab === 'animasi' && <AnimationTab draft={draft} setDraft={setDraft} />}
            {tab === 'scene' && <SceneTab currentScene={currentScene} onCreateScene={onCreateScene} onDone={onClose} />}
            {tab === 'output' && <OutputTab draft={draft} setDraft={setDraft} />}
            {tab === 'performa' && <PerformanceTab draft={draft} setDraft={setDraft} saved={settings} />}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${C.border}` }}>
          {msg && <span className="text-[11px] flex-1" style={{ color: msg.ok ? '#86efac' : '#fca5a5' }}>{msg.text}</span>}
          {!msg && <span className="flex-1 text-[11px]" style={{ color: C.dim }}>{dirty ? 'Ada perubahan belum disimpan' : ''}</span>}
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm"
            style={{ background: '#1e2535', color: C.muted, border: `1px solid ${C.border}` }}>Tutup</button>
          <button onClick={handleSave} disabled={!dirty || saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold"
            style={{ background: dirty ? '#1d4ed8' : '#1e2535', color: dirty ? '#fff' : C.dim, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Menyimpan…' : '💾 Simpan Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 1. Teks ──

function TextTab({ draft, patchText, setShowReference }: {
  draft: AppSettings
  patchText: (n: 1 | 2, p: Partial<DisplayTextSettings>) => void
  setShowReference: (v: boolean) => void
}) {
  const [fontFor, setFontFor] = useState<1 | 2 | null>(null)
  const positions: { id: TextPosition; label: string }[] = [
    { id: 'top', label: 'Atas' }, { id: 'center', label: 'Tengah' }, { id: 'bottom', label: 'Bawah' },
  ]
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {([1, 2] as const).map(n => {
          const t = draft[`display${n}`].text
          const style = { ...DEFAULT_TEXT_STYLE, ...textSettingsToStyle(t) }
          return (
            <Section key={n} title={`Display ${n}`} note={n === 1 ? 'Default untuk lagu & ayat baru' : 'Dipakai Output Display 2 (mode Custom)'}>
              <div>
                <p className="text-[10px] mb-1" style={{ color: C.muted }}>Font</p>
                <button onClick={() => setFontFor(n)} className="w-full px-2.5 py-1.5 rounded-lg text-left text-sm flex justify-between"
                  style={{ background: '#1e2535', border: `1px solid ${C.border}`, color: '#e2e8f0', fontFamily: t.fontFamily }}>
                  <span className="truncate">{t.fontFamily.replace(/,.*$/, '').replace(/['"]/g, '')}</span>
                  <span className="text-[10px]" style={{ color: C.dim, fontFamily: 'Inter' }}>▼ Pilih</span>
                </button>
              </div>
              <div>
                <p className="text-[10px] mb-1" style={{ color: C.muted }}>Gaya</p>
                <div className="flex gap-1">
                  {([['bold', 'B', { fontWeight: 700 }], ['italic', 'I', { fontStyle: 'italic' }], ['shadow', 'Shadow', {}]] as const).map(([k, label, css]) => (
                    <button key={k} onClick={() => patchText(n, { [k]: !t[k] })}
                      className="px-3 py-1 rounded-lg text-[12px]"
                      style={{ ...css, background: t[k] ? '#1d4ed8' : '#1e2535', color: '#fff', border: `1px solid ${t[k] ? '#2563eb' : C.border}` }}>
                      {label}
                    </button>
                  ))}
                  <span className="text-[10px] self-center ml-1" style={{ color: C.dim }}>
                    {!t.bold && !t.italic ? 'Normal' : ''}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] mb-1" style={{ color: C.muted }}>Ukuran: <b style={{ color: '#fff' }}>{t.fontSize}px</b> (layar 1920)</p>
                <input type="range" min={24} max={200} step={2} value={t.fontSize}
                  onChange={e => patchText(n, { fontSize: Number(e.target.value) })} className="w-full" />
              </div>
              <div>
                <p className="text-[10px] mb-1" style={{ color: C.muted }}>Posisi teks</p>
                <Seg value={t.position} options={positions} onChange={v => patchText(n, { position: v })} />
              </div>
              <Preview text={'Besar kuasa-Mu ya Tuhan\nTiada yang seperti Engkau'}
                background={draft[`display${n}`].songBackground} style={style} />
            </Section>
          )
        })}
      </div>
      <Section title="Ayat Alkitab" note="Referensi ditampilkan di depan teks ayat pada output, contoh: Yoh 3:16 : Karena begitu besar kasih Allah…">
        <Toggle on={draft.scripture.showReference} onChange={setShowReference} label="Tampilkan kitab, pasal & ayat" />
      </Section>
      {fontFor && (
        <FontPickerModal currentFont={draft[`display${fontFor}`].text.fontFamily}
          onSelect={f => patchText(fontFor, { fontFamily: f })} onClose={() => setFontFor(null)} />
      )}
    </>
  )
}

// ── 2. Background ──

function BackgroundTab({ draft, lib, patchDisplay }: {
  draft: AppSettings; lib: BgLibrary; patchDisplay: (n: 1 | 2, p: Partial<DisplaySettings>) => void
}) {
  const [picking, setPicking] = useState<string | null>(null)   // "1-songBackground" etc.
  return (
    <div className="grid grid-cols-2 gap-3">
      {([1, 2] as const).map(n => (
        <Section key={n} title={`Display ${n}`} note={n === 1 ? 'Background awal lagu / ayat baru' : 'Background Output Display 2 (mode Custom)'}>
          {([['songBackground', 'Lagu'], ['scriptureBackground', 'Alkitab']] as const).map(([key, label]) => {
            const id = `${n}-${key}`
            const current = draft[`display${n}`][key]
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <BgThumb bg={current} active onClick={() => setPicking(picking === id ? null : id)} />
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold" style={{ color: '#fff' }}>{label}</p>
                    <button onClick={() => setPicking(picking === id ? null : id)} className="text-[11px]" style={{ color: '#60a5fa' }}>
                      {picking === id ? 'Tutup pilihan' : 'Ganti background…'}
                    </button>
                  </div>
                </div>
                {picking === id && (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg max-h-48 overflow-y-auto" style={{ background: C.panel }}>
                    {lib.library.map(e => (
                      <BgThumb key={e.id} bg={e.background}
                        active={JSON.stringify(e.background) === JSON.stringify(current)}
                        onClick={() => { patchDisplay(n, { [key]: e.background }); setPicking(null) }} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </Section>
      ))}
    </div>
  )
}

// ── 3. Animasi ──

function AnimationTab({ draft, setDraft }: { draft: AppSettings; setDraft: React.Dispatch<React.SetStateAction<AppSettings>> }) {
  const groups = [
    { key: 'verse',  label: 'Verse',  sample: 'Besar kuasa-Mu ya Tuhan\nTiada yang seperti Engkau' },
    { key: 'chorus', label: 'Chorus', sample: 'Kau Tuhan yang menyelamatkan\nKau Tuhan yang memulihkan' },
    { key: 'bridge', label: 'Bridge', sample: 'Hallelujah, hallelujah' },
  ] as const
  const style = defaultTextStyle(draft)
  return (
    <Section title="Animasi Teks Default — Display 1" note="Dipakai otomatis untuk lagu baru (Chorus juga berlaku untuk Reff). Bisa diubah per lagu di panel Animasi Teks.">
      <div className="space-y-3">
        {groups.map(g => {
          const anim = draft.animations[g.key]
          return (
            <div key={g.key} className="flex gap-3 items-start">
              <div className="flex-1 space-y-1.5">
                <p className="text-[12px] font-semibold" style={{ color: '#fff' }}>
                  {g.label} <span className="text-[10px] font-normal" style={{ color: C.dim }}>· {presetNameOf(anim)}</span>
                </p>
                <div className="flex gap-1 flex-wrap">
                  {ANIMATION_PRESETS.map(p => {
                    const active = presetNameOf(anim) === p.name
                    return (
                      <button key={p.name}
                        onClick={() => setDraft(d => ({ ...d, animations: { ...d.animations, [g.key]: p.anim } }))}
                        className="text-[11px] px-2 py-1 rounded-lg"
                        style={{ background: active ? '#6d28d9' : '#1e2535', color: '#fff', border: `1px solid ${active ? '#8b5cf6' : C.border}` }}>
                        {p.name}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ width: 200 }} key={JSON.stringify(anim)}>
                <Preview text={g.sample} background={draft.display1.songBackground} style={{ ...style, animation: anim ?? undefined }} />
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ── 4. Scene ──

function SceneTab({ currentScene, onCreateScene, onDone }: {
  currentScene: SceneRef | null; onCreateScene: (name: string, date: string | null) => Promise<void>; onDone: () => void
}) {
  const [name, setName]   = useState('')
  const [date, setDate]   = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)

  const create = async () => {
    setError('')
    if (!name.trim()) { setError('Nama scene wajib diisi'); return }
    if (!confirm) { setConfirm(true); return }
    setBusy(true)
    try {
      await onCreateScene(name.trim(), date || null)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat scene')
      setBusy(false)
    }
  }

  return (
    <Section title="Buat Scene Baru (Urutan Ibadah)" note="Membuat urutan ibadah baru yang kosong dan langsung tersimpan di database.">
      <p className="text-[11px]" style={{ color: C.muted }}>
        Scene aktif sekarang: <b style={{ color: '#fff' }}>{currentScene?.name ?? '(belum disimpan)'}</b>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={e => { setName(e.target.value); setConfirm(false) }} placeholder="Ibadah Minggu, 16 Nov 2026"
          className="px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ background: C.panel, border: `1px solid ${C.border}`, color: '#f1f5f9' }} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm focus:outline-none"
          style={{ background: C.panel, border: `1px solid ${C.border}`, color: '#f1f5f9', colorScheme: 'dark' }} />
      </div>
      {confirm && (
        <p className="text-[11px] px-3 py-2 rounded-lg" style={{ background: '#422006', color: '#fed7aa' }}>
          ⚠ Urutan ibadah yang sedang terbuka akan diganti. Simpan dulu lewat tombol Scene di panel kiri bila perlu.
          Klik sekali lagi untuk melanjutkan.
        </p>
      )}
      {error && <p className="text-[11px]" style={{ color: '#fca5a5' }}>{error}</p>}
      <button onClick={create} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-semibold"
        style={{ background: confirm ? '#b45309' : '#1d4ed8', color: '#fff', opacity: busy ? 0.7 : 1 }}>
        {busy ? 'Membuat…' : confirm ? 'Ya, buat scene baru' : '📋 Buat & Simpan Scene'}
      </button>
    </Section>
  )
}

// ── 5. Output ──

function OutputTab({ draft, setDraft }: { draft: AppSettings; setDraft: React.Dispatch<React.SetStateAction<AppSettings>> }) {
  const [displays, setDisplays] = useState<NativeDisplay[] | null>(null)
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI

  useEffect(() => {
    window.electronAPI?.getDisplays().then(setDisplays).catch(() => setDisplays([]))
  }, [])

  const options = [
    { id: -1, label: 'Otomatis (layar kedua)' },
    ...(displays ?? []).map(d => ({
      id: d.id,
      label: `${d.connector ?? 'Layar'} · ${d.label} · ${d.bounds.width}×${d.bounds.height}${d.isPrimary ? ' (utama)' : ''}`,
    })),
  ]

  const setTarget = (n: 1 | 2, patch: Partial<AppSettings['output']['display2']>) =>
    setDraft(d => ({ ...d, output: { ...d.output, [`display${n}`]: { ...d.output[`display${n}`], ...patch } } }))

  return (
    <>
      {!isElectron && (
        <Section title="Mode browser" note="Deteksi monitor & jendela fullscreen otomatis hanya tersedia di aplikasi desktop (Electron).">
          <p className="text-[11px]" style={{ color: C.muted }}>
            Untuk test, buka jendela output di browser lalu seret ke monitor/proyektor (F11 = fullscreen):
          </p>
          <div className="flex gap-2">
            {[1, 2].map(n => (
              <button key={n} onClick={() => window.open(`/output/?display=${n}`, `easychurch-output-${n}`, 'width=960,height=540')}
                className="px-3 py-1.5 rounded-lg text-[12px]" style={{ background: '#1e2535', color: '#fff', border: `1px solid ${C.border}` }}>
                ↗ Buka Output Display {n}
              </button>
            ))}
          </div>
        </Section>
      )}

      {([1, 2] as const).map(n => {
        const t = draft.output[`display${n}`]
        return (
          <Section key={n} title={`Output Display ${n}`}
            note={n === 1 ? 'Proyektor / layar utama jemaat' : 'Opsional — layer kedua yang jalan bersamaan dengan tampilan berbeda (mis. live stream / layar samping)'}>
            <Toggle on={t.enabled} onChange={v => setTarget(n, { enabled: v })} label={`Aktifkan Display ${n}`} />
            <div>
              <p className="text-[10px] mb-1" style={{ color: C.muted }}>
                Monitor / port {displays === null && isElectron ? '(mendeteksi…)' : ''}
              </p>
              <select value={t.displayId ?? -1} disabled={!isElectron}
                onChange={e => setTarget(n, { displayId: Number(e.target.value) === -1 ? null : Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg text-[12px] focus:outline-none"
                style={{ background: '#1e2535', border: `1px solid ${C.border}`, color: '#e2e8f0' }}>
                {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] mb-1" style={{ color: C.muted }}>Chroma Key (untuk ATEM / video switcher)</p>
              <Seg value={t.chromaKey}
                options={[{ id: 'off', label: 'Off (proyektor)' }, { id: 'green', label: 'Hijau' }, { id: 'blue', label: 'Biru' }]}
                onChange={v => setTarget(n, { chromaKey: v })} />
              {t.chromaKey !== 'off' && (
                <div className="mt-2 space-y-2">
                  <Toggle on={t.subtitle} onChange={v => setTarget(n, { subtitle: v })} label="Teks model subtitle (selalu di bawah)" />
                  <p className="text-[10px]" style={{ color: C.dim }}>
                    Semua background lagu, ayat, Blank dan area kosong di sekitar media menjadi {t.chromaKey === 'green' ? 'hijau' : 'biru'} —
                    samakan dengan warna key di ATEM. Di ATEM: program tetap di kamera, input PC dipasang sebagai
                    Upstream Key → Chroma, lalu KEY ON AIR. Gambar & video media tetap menutupi kamera.
                  </p>
                </div>
              )}
            </div>
            {n === 2 && (
              <div>
                <p className="text-[10px] mb-1" style={{ color: C.muted }}>Tampilan Display 2</p>
                <Seg value={draft.output.display2.mode}
                  options={[{ id: 'custom', label: 'Custom (font & background Display 2)' }, { id: 'mirror', label: 'Sama dengan Display 1' }]}
                  onChange={v => setTarget(2, { mode: v })} />
              </div>
            )}
          </Section>
        )
      })}

      <Section title="Port yang terdeteksi" note="Dibaca dari Windows (WMI). SDI hanya muncul bila driver kartu capture/playout melaporkannya sebagai monitor.">
        {!isElectron ? (
          <p className="text-[11px]" style={{ color: C.dim }}>Tersedia di aplikasi desktop.</p>
        ) : !displays?.length ? (
          <p className="text-[11px]" style={{ color: C.dim }}>{displays ? 'Tidak ada monitor terdeteksi' : 'Mendeteksi…'}</p>
        ) : (
          <div className="space-y-1">
            {displays.map(d => (
              <div key={d.id} className="flex items-center gap-2 text-[12px]" style={{ color: '#e2e8f0' }}>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: '#1e3a5f', color: '#93c5fd' }}>
                  {d.connector ?? '?'}
                </span>
                {d.label} · {d.bounds.width}×{d.bounds.height} {d.isPrimary && <span style={{ color: C.dim }}>(layar operator)</span>}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="NDI Output" note="Belum tersedia — butuh integrasi NDI SDK (native addon). Struktur setting sudah disiapkan.">
        <Toggle on={false} onChange={() => {}} label="Kirim Display 1 sebagai sumber NDI" disabled />
        <p className="text-[11px]" style={{ color: C.muted }}>
          Sementara: pakai <b>NDI Tools → Screen Capture</b> atau OBS (Window Capture / Browser Source
          <code className="mx-1" style={{ color: '#93c5fd' }}>http://localhost:3001/output/?display=2</code>) + plugin NDI.
        </p>
      </Section>
    </>
  )
}

// ── 6. Performa ──

function PerformanceTab({ draft, setDraft, saved }: {
  draft: AppSettings; setDraft: React.Dispatch<React.SetStateAction<AppSettings>>; saved: AppSettings
}) {
  const [gpu, setGpu] = useState<Record<string, string> | null>(null)
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI
  useEffect(() => { window.electronAPI?.getGpuInfo?.().then(setGpu).catch(() => {}) }, [])

  const [ff, setFf] = useState<{ ffmpeg: { version: string } | null; encoder: string | null } | null>(null)
  useEffect(() => {
    fetch('/api/media/status/').then(r => r.json()).then(setFf).catch(() => setFf({ ffmpeg: null, encoder: null }))
  }, [])

  const p = draft.performance
  const set = (patch: Partial<AppSettings['performance']>) => setDraft(d => ({ ...d, performance: { ...d.performance, ...patch } }))
  const setVideo = (patch: Partial<AppSettings['performance']['video']>) =>
    setDraft(d => ({ ...d, performance: { ...d.performance, video: { ...d.performance.video, ...patch } } }))
  // Only the Chromium flags need a restart; low-spec mode and video limits apply immediately
  const restartKeys = (x: AppSettings['performance']) => [x.hardwareAcceleration, x.gpuRasterization, x.maxMemoryMB].join()
  const needsRestart = restartKeys(p) !== restartKeys(saved.performance)
  const v = p.video

  return (
    <>
      <Section title="Mode PC Spek Rendah"
        note="Untuk PC kantor / laptop lama (RAM 4–8 GB, grafis terintegrasi lama). Langsung berlaku setelah disimpan.">
        <Toggle on={p.lowSpecMode} onChange={x => set({ lowSpecMode: x })} label="Aktifkan Mode Spek Rendah" />
        <ul className="text-[10px] list-disc pl-5 space-y-0.5" style={{ color: C.muted }}>
          <li>Efek teks berulang (Glow, Neon, Pulse, Float) dimatikan — animasi masuk tetap jalan</li>
          <li>Preview video live di Center Panel dimatikan (video tetap tampil di Output)</li>
          <li>Thumbnail selalu diam (berlaku juga tanpa mode ini)</li>
        </ul>
      </Section>

      <Section title="Video — konversi otomatis"
        note="Video yang melebihi batas dikonversi ke MP4 H.264 saat di-upload, supaya ringan di GPU / RAM PC mana pun.">
        <p className="text-[11px]" style={{ color: ff?.ffmpeg ? '#86efac' : '#fca5a5' }}>
          {ff === null ? 'Memeriksa FFmpeg…'
            : ff.ffmpeg ? `FFmpeg ${ff.ffmpeg.version} siap${ff.encoder ? ` · encoder ${ff.encoder}` : ''}`
            : 'FFmpeg tidak ditemukan — konversi nonaktif (lihat docs/SYSTEM_REQUIREMENTS.md)'}
        </p>
        <Toggle on={v.autoConvert} onChange={x => setVideo({ autoConvert: x })} label="Konversi otomatis video yang terlalu berat" />
        <div>
          <p className="text-[10px] mb-1" style={{ color: C.muted }}>Resolusi maksimum</p>
          <Seg value={v.maxHeight} onChange={x => setVideo({ maxHeight: x })}
            options={[{ id: 720, label: '720p (PC lemah)' }, { id: 1080, label: '1080p (standar)' }, { id: 2160, label: '4K' }]} />
        </div>
        <div>
          <p className="text-[10px] mb-1" style={{ color: C.muted }}>Bitrate maksimum</p>
          <Seg value={v.maxBitrateKbps} onChange={x => setVideo({ maxBitrateKbps: x })}
            options={[{ id: 6000, label: '6 Mbps' }, { id: 12000, label: '12 Mbps' }, { id: 25000, label: '25 Mbps' }]} />
        </div>
        <div>
          <p className="text-[10px] mb-1" style={{ color: C.muted }}>Frame rate maksimum</p>
          <Seg value={v.maxFps} onChange={x => setVideo({ maxFps: x })}
            options={[{ id: 30, label: '30 fps' }, { id: 60, label: '60 fps' }]} />
        </div>
        <Toggle on={v.keepOriginal} onChange={x => setVideo({ keepOriginal: x })} label="Simpan file asli setelah konversi (butuh ruang disk lebih)" />
        <p className="text-[10px]" style={{ color: C.dim }}>
          Format yang selalu dikonversi: AVI, MKV, WMV, MPG, FLV, 3GP, TS. Codec ringan yang diputar langsung: H.264, VP8, VP9.
        </p>
      </Section>

      <Section title="GPU" note="Akselerasi GPU membuat video & animasi background lebih halus. Matikan hanya bila output berkedip / hitam di PC lama.">
        <Toggle on={p.hardwareAcceleration} onChange={v => set({ hardwareAcceleration: v })} label="Hardware acceleration (GPU)" />
        <Toggle on={p.gpuRasterization} onChange={v => set({ gpuRasterization: v })} label="GPU rasterization (render teks & grafis di GPU)"
          disabled={!p.hardwareAcceleration} />
        {gpu && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] pt-1">
            {Object.entries(gpu).slice(0, 12).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span style={{ color: C.dim }}>{k}</span>
                <span style={{ color: v.startsWith('enabled') ? '#86efac' : '#fca5a5' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Memori (RAM)" note="Batas memori JavaScript per jendela. Naikkan bila memakai banyak video / PDF besar.">
        <Seg value={p.maxMemoryMB}
          options={[{ id: 2048, label: '2 GB' }, { id: 4096, label: '4 GB' }, { id: 8192, label: '8 GB' }]}
          onChange={v => set({ maxMemoryMB: v })} />
      </Section>

      <p className="text-[11px] px-3 py-2 rounded-lg" style={{ background: '#0d1520', color: C.muted }}>
        {isElectron
          ? needsRestart ? '⚠ Perubahan performa berlaku setelah Simpan Settings lalu aplikasi di-restart.' : 'Setting performa sudah aktif.'
          : 'Setting performa berlaku di aplikasi desktop (Electron).'}
        {isElectron && needsRestart === false && saved && window.electronAPI?.relaunch && (
          <button onClick={() => window.electronAPI?.relaunch?.()} className="ml-2 underline" style={{ color: '#60a5fa' }}>
            Restart sekarang
          </button>
        )}
      </p>
    </>
  )
}
