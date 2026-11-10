'use client'

import { useState } from 'react'

export function LiveControlPanel() {
  const [isLive, setIsLive] = useState(false)
  const [isBlank, setIsBlank] = useState(false)

  return (
    <div className="h-full flex">
      {/* Left: current/next slide */}
      <div className="w-96 border-r border-surface-border bg-surface-mid p-4 flex flex-col gap-4">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Current Slide</div>
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center border border-surface-border">
            <p className="text-white text-sm text-center px-4">Sebab begitu besar kasih Allah</p>
          </div>
          <div className="text-xs text-slate-400 mt-1 text-center">Yohanes 3:16 — TB</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Next Slide</div>
          <div className="aspect-video bg-surface-dark rounded-lg flex items-center justify-center border border-dashed border-surface-border">
            <p className="text-slate-600 text-xs">Empty</p>
          </div>
        </div>
      </div>

      {/* Center: controls */}
      <div className="flex-1 p-6 flex flex-col gap-6">
        {/* Go live / blank */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setIsLive(v => !v)}
            className={`py-4 rounded-xl text-lg font-bold transition-all ${
              isLive
                ? 'bg-studio-red text-white shadow-lg shadow-red-900/40 ring-2 ring-red-500'
                : 'bg-surface-light text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isLive ? '● LIVE' : '○ Go Live'}
          </button>
          <button
            onClick={() => setIsBlank(v => !v)}
            className={`py-4 rounded-xl text-lg font-bold transition-all ${
              isBlank
                ? 'bg-studio-amber text-black shadow-lg shadow-yellow-900/40 ring-2 ring-yellow-400'
                : 'bg-surface-light text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isBlank ? 'BLANK' : 'Blank Screen'}
          </button>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-3 gap-3">
          <button className="py-3 rounded-lg bg-surface-light hover:bg-slate-700 text-slate-300 font-medium transition-colors">
            Prev
          </button>
          <button className="py-3 rounded-lg bg-studio-blue hover:bg-blue-500 text-white font-bold transition-colors">
            Next
          </button>
          <button className="py-3 rounded-lg bg-surface-light hover:bg-slate-700 text-slate-300 font-medium transition-colors">
            Clear
          </button>
        </div>

        {/* Send to overlay */}
        <div className="border border-surface-border rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Quick Lower Third</div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Name / Title..."
              className="flex-1 px-3 py-2 bg-surface-dark border border-surface-border rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-studio-blue"
            />
            <button className="px-4 py-2 bg-studio-blue hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
              Push
            </button>
            <button className="px-4 py-2 bg-surface-light hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors">
              Clear
            </button>
          </div>
        </div>

        {/* Sync status */}
        <div className="border border-surface-border rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Connected Apps</div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="w-2 h-2 rounded-full bg-studio-green" />
            EasyPresenter (192.168.1.5)
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            EasyBible — Not connected
          </div>
        </div>
      </div>

      {/* Right: OBS/vMix integration hint */}
      <div className="w-64 border-l border-surface-border bg-surface-mid p-4">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Integration</div>
        <div className="space-y-2">
          {['OBS Studio', 'vMix', 'NDI Output', 'Wirecast'].map(app => (
            <div key={app} className="flex items-center justify-between p-2 rounded-lg bg-surface-dark">
              <span className="text-xs text-slate-300">{app}</span>
              <span className="w-2 h-2 rounded-full bg-slate-600" />
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-blue-950/50 border border-blue-900/50">
          <p className="text-xs text-blue-300 leading-relaxed">
            Use the transparent overlay window for lower thirds in OBS/vMix via Window Capture source.
          </p>
        </div>
      </div>
    </div>
  )
}
