'use client'

import { useState, useCallback } from 'react'
import type { LowerThirdStyle } from '@/types/electron'

interface LowerThirdData {
  name: string
  title: string
  subtitle: string
  style: LowerThirdStyle
}

const DEFAULT_STYLE: LowerThirdStyle = {
  bgColor: '#1e3a5f',
  textColor: '#ffffff',
  accentColor: '#3b82f6',
  position: 'bottom-left',
  animation: 'slide-up',
}

export function LowerThirdsDesigner() {
  const [data, setData] = useState<LowerThirdData>({
    name: '',
    title: '',
    subtitle: '',
    style: DEFAULT_STYLE,
  })
  const [isLive, setIsLive] = useState(false)
  const [savedPresets, setSavedPresets] = useState<LowerThirdData[]>([])

  const pushOverlay = useCallback(() => {
    window.studioAPI?.sendOverlay({
      type: 'lower-third',
      name: data.name,
      title: data.title,
      subtitle: data.subtitle,
      style: data.style,
    })
    window.studioAPI?.showOverlayWindow(true)
    setIsLive(true)
  }, [data])

  const clearOverlay = useCallback(() => {
    window.studioAPI?.sendOverlay({ type: 'clear' })
    window.studioAPI?.showOverlayWindow(false)
    setIsLive(false)
  }, [])

  const savePreset = () => {
    if (!data.name) return
    setSavedPresets(prev => [...prev, { ...data }])
  }

  const loadPreset = (preset: LowerThirdData) => setData(preset)

  return (
    <div className="h-full flex">
      {/* Left: editor */}
      <div className="w-80 border-r border-surface-border bg-surface-mid flex flex-col">
        <div className="p-4 border-b border-surface-border">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Lower Third Content</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Name / Main Text</label>
              <input
                value={data.name}
                onChange={e => setData(d => ({ ...d, name: e.target.value }))}
                placeholder="Pdt. Yohanes Santoso"
                className="w-full px-3 py-2 bg-surface-dark border border-surface-border rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-studio-blue"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Title / Role</label>
              <input
                value={data.title}
                onChange={e => setData(d => ({ ...d, title: e.target.value }))}
                placeholder="Gembala Sidang"
                className="w-full px-3 py-2 bg-surface-dark border border-surface-border rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-studio-blue"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Subtitle (optional)</label>
              <input
                value={data.subtitle}
                onChange={e => setData(d => ({ ...d, subtitle: e.target.value }))}
                placeholder="GKI Surabaya"
                className="w-full px-3 py-2 bg-surface-dark border border-surface-border rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-studio-blue"
              />
            </div>
          </div>
        </div>

        {/* Style */}
        <div className="p-4 border-b border-surface-border flex-1 overflow-y-auto">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Style</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Position</label>
              <select
                value={data.style.position}
                onChange={e => setData(d => ({ ...d, style: { ...d.style, position: e.target.value as LowerThirdStyle['position'] } }))}
                className="w-full px-3 py-2 bg-surface-dark border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-studio-blue"
              >
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Animation</label>
              <select
                value={data.style.animation}
                onChange={e => setData(d => ({ ...d, style: { ...d.style, animation: e.target.value as LowerThirdStyle['animation'] } }))}
                className="w-full px-3 py-2 bg-surface-dark border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-studio-blue"
              >
                <option value="slide-up">Slide Up</option>
                <option value="fade">Fade</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['bgColor', 'textColor', 'accentColor'] as const).map(key => (
                <div key={key}>
                  <label className="text-xs text-slate-400 block mb-1 capitalize">
                    {key === 'bgColor' ? 'BG' : key === 'textColor' ? 'Text' : 'Accent'}
                  </label>
                  <input
                    type="color"
                    value={data.style[key]}
                    onChange={e => setData(d => ({ ...d, style: { ...d.style, [key]: e.target.value } }))}
                    className="w-full h-8 rounded cursor-pointer border border-surface-border bg-surface-dark"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={pushOverlay}
              className="py-2.5 bg-studio-blue hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors"
            >
              Push Live
            </button>
            <button
              onClick={clearOverlay}
              className="py-2.5 bg-surface-light hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
          <button
            onClick={savePreset}
            className="w-full py-2 bg-surface-dark border border-surface-border hover:border-slate-500 text-slate-400 text-sm rounded-lg transition-colors"
          >
            Save as Preset
          </button>
        </div>
      </div>

      {/* Center: preview */}
      <div className="flex-1 flex flex-col p-6 gap-4">
        <div className="text-xs text-slate-500 uppercase tracking-wider">Preview</div>
        <LowerThirdPreview data={data} isLive={isLive} />
      </div>

      {/* Right: presets */}
      <div className="w-56 border-l border-surface-border bg-surface-mid p-4">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Saved Presets</div>
        {savedPresets.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4">No presets saved</p>
        )}
        {savedPresets.map((preset, i) => (
          <button
            key={i}
            onClick={() => loadPreset(preset)}
            className="w-full text-left px-3 py-2 rounded-lg bg-surface-dark hover:bg-surface-light mb-1 transition-colors"
          >
            <div className="text-xs font-medium text-white truncate">{preset.name}</div>
            <div className="text-xs text-slate-500 truncate">{preset.title}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function LowerThirdPreview({ data, isLive }: { data: LowerThirdData; isLive: boolean }) {
  const positionClasses: Record<string, string> = {
    'bottom-left':   'bottom-16 left-12',
    'bottom-center': 'bottom-16 left-1/2 -translate-x-1/2',
    'bottom-right':  'bottom-16 right-12',
    'top-left':      'top-12 left-12',
    'top-right':     'top-12 right-12',
  }
  const pos = positionClasses[data.style.position] ?? positionClasses['bottom-left']

  return (
    <div className="flex-1 relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden border border-surface-border">
      {/* Simulated video background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-slate-600 text-sm">[ Live Video Background ]</p>
      </div>

      {/* Live indicator */}
      {isLive && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-xs text-white font-bold">LIVE</span>
        </div>
      )}

      {/* Lower third overlay */}
      {(data.name || data.title) && (
        <div
          className={`absolute ${pos}`}
          style={{
            animation: data.style.animation !== 'none' ? undefined : undefined,
          }}
        >
          <div
            className="rounded-sm overflow-hidden"
            style={{ backgroundColor: data.style.bgColor, borderLeft: `4px solid ${data.style.accentColor}` }}
          >
            {data.name && (
              <div className="px-4 pt-2 pb-1">
                <p className="text-lg font-bold" style={{ color: data.style.textColor }}>
                  {data.name}
                </p>
              </div>
            )}
            {data.title && (
              <div
                className="px-4 pb-2 pt-0"
                style={{ backgroundColor: `${data.style.accentColor}22` }}
              >
                <p className="text-sm" style={{ color: data.style.textColor + 'CC' }}>
                  {data.title}
                  {data.subtitle ? ` · ${data.subtitle}` : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
