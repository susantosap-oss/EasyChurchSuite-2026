'use client'

import { useState } from 'react'

export function StageDisplayControl() {
  const [isVisible, setIsVisible] = useState(false)
  const [config, setConfig] = useState({
    showNextSlide: true,
    showChords: true,
    showClock: true,
    fontSize: 32,
    bgColor: '#000000',
    textColor: '#ffffff',
  })

  const toggleStage = () => {
    const next = !isVisible
    setIsVisible(next)
    window.studioAPI?.showStageWindow(next)
  }

  return (
    <div className="h-full flex">
      {/* Config panel */}
      <div className="w-80 border-r border-surface-border bg-surface-mid p-4 flex flex-col gap-4">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Stage Monitor Settings</div>
          <div className="space-y-3">
            {[
              { key: 'showNextSlide', label: 'Show Next Slide' },
              { key: 'showChords',    label: 'Show Chord Chart' },
              { key: 'showClock',     label: 'Show Clock' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-300">{label}</span>
                <div
                  onClick={() => setConfig(c => ({ ...c, [key]: !c[key as keyof typeof c] }))}
                  className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${
                    config[key as keyof typeof config] ? 'bg-studio-blue' : 'bg-surface-dark border border-surface-border'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                    config[key as keyof typeof config] ? 'left-5' : 'left-0.5'
                  }`} />
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Font Size: {config.fontSize}px</label>
          <input
            type="range" min={20} max={80} value={config.fontSize}
            onChange={e => setConfig(c => ({ ...c, fontSize: parseInt(e.target.value) }))}
            className="w-full accent-studio-blue"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Background</label>
            <input type="color" value={config.bgColor}
              onChange={e => setConfig(c => ({ ...c, bgColor: e.target.value }))}
              className="w-full h-8 rounded border border-surface-border bg-surface-dark cursor-pointer" />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Text Color</label>
            <input type="color" value={config.textColor}
              onChange={e => setConfig(c => ({ ...c, textColor: e.target.value }))}
              className="w-full h-8 rounded border border-surface-border bg-surface-dark cursor-pointer" />
          </div>
        </div>

        <button
          onClick={toggleStage}
          className={`w-full py-3 rounded-xl font-bold transition-all ${
            isVisible
              ? 'bg-studio-green text-black ring-2 ring-green-400'
              : 'bg-surface-light text-slate-300 hover:bg-slate-700'
          }`}
        >
          {isVisible ? 'Stage Display: ON' : 'Show Stage Display'}
        </button>
      </div>

      {/* Preview */}
      <div className="flex-1 p-6">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-4">Stage Monitor Preview</div>
        <div
          className="w-full max-w-2xl aspect-video rounded-xl overflow-hidden border border-surface-border flex flex-col"
          style={{ backgroundColor: config.bgColor }}
        >
          {/* Current slide */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 border-b border-white/10">
            <p className="font-bold text-center leading-tight"
              style={{ color: config.textColor, fontSize: `${config.fontSize}px` }}>
              Sebab begitu besar kasih Allah
            </p>
            {config.showChords && (
              <p className="mt-3 text-yellow-400 text-sm font-mono">G - D - Em - C</p>
            )}
          </div>

          {/* Next slide + clock */}
          {config.showNextSlide && (
            <div className="h-20 flex items-center px-8 gap-4">
              <div className="flex-1">
                <div className="text-xs opacity-50 mb-1" style={{ color: config.textColor }}>NEXT</div>
                <p className="text-sm opacity-70" style={{ color: config.textColor }}>
                  ...akan dunia ini, sehingga Ia telah
                </p>
              </div>
              {config.showClock && (
                <div className="text-2xl font-mono" style={{ color: config.textColor }}>
                  {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
