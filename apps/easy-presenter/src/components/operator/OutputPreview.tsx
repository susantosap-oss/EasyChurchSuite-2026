'use client'

import { useState } from 'react'

export function OutputPreview() {
  const [isBlank, setIsBlank] = useState(false)

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-surface-light">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Output Preview</span>
      </div>

      {/* 16:9 preview canvas */}
      <div className="p-3">
        <div className="aspect-video bg-black rounded overflow-hidden relative border border-surface-light">
          {isBlank ? (
            <div className="absolute inset-0 bg-black" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4"
              style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
              <p className="text-white text-center text-sm leading-relaxed font-light">
                Sebab begitu besar kasih Allah akan dunia ini
              </p>
              <p className="text-slate-400 text-xs mt-2">Yohanes 3:16</p>
            </div>
          )}
          {/* Live indicator */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-green-400 font-mono">LIVE</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button className="py-1.5 text-xs rounded bg-surface-dark border border-surface-light hover:border-slate-500 text-slate-300 transition-colors">
            Prev
          </button>
          <button className="py-1.5 text-xs rounded bg-surface-dark border border-surface-light hover:border-slate-500 text-slate-300 transition-colors">
            Next
          </button>
        </div>
        <button
          onClick={() => setIsBlank(v => !v)}
          className={`w-full py-1.5 text-xs rounded border transition-colors ${
            isBlank
              ? 'bg-orange-600 border-orange-500 text-white'
              : 'bg-surface-dark border-surface-light text-slate-300 hover:border-slate-500'
          }`}
        >
          {isBlank ? 'Show Screen' : 'Blank Screen'}
        </button>
      </div>

      {/* Connection status */}
      <div className="mt-auto p-3 border-t border-surface-light">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Sync: Connected (0 remotes)</span>
        </div>
      </div>
    </div>
  )
}
