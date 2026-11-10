'use client'

import { useState } from 'react'

interface Slide {
  id: number
  label: string
  preview: string
  isActive: boolean
}

const DEMO_SLIDES: Slide[] = [
  { id: 1, label: 'Slide 1', preview: 'Sebab begitu besar kasih Allah', isActive: true },
  { id: 2, label: 'Slide 2', preview: 'akan dunia ini, sehingga Ia telah', isActive: false },
  { id: 3, label: 'Slide 3', preview: 'mengaruniakan Anak-Nya yang tunggal,', isActive: false },
  { id: 4, label: 'Slide 4', preview: 'supaya setiap orang yang percaya kepada-Nya', isActive: false },
  { id: 5, label: 'Slide 5', preview: 'tidak binasa, melainkan beroleh hidup yang kekal.', isActive: false },
  { id: 6, label: 'Ref', preview: 'Yohanes 3:16 (TB)', isActive: false },
]

export function SlidePreviewPanel() {
  const [slides, setSlides] = useState(DEMO_SLIDES)
  const [activeId, setActiveId] = useState(1)

  const activate = (id: number) => setActiveId(id)

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="h-10 border-b border-surface-light flex items-center px-3 gap-2">
        <span className="text-sm text-slate-400 font-medium">Yohanes 3:16</span>
        <div className="flex-1" />
        <button className="text-xs px-2 py-1 rounded bg-surface-light hover:bg-slate-600 text-slate-300 transition-colors">
          Blank
        </button>
        <button className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors">
          Go Live
        </button>
      </div>

      {/* Slide grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-3 gap-2">
          {slides.map(slide => (
            <button
              key={slide.id}
              onClick={() => activate(slide.id)}
              className={`aspect-video rounded border-2 flex flex-col items-center justify-center p-2 transition-all text-left ${
                activeId === slide.id
                  ? 'border-blue-500 bg-blue-950'
                  : 'border-surface-light bg-surface-dark hover:border-slate-500'
              }`}
            >
              <span className="text-xs text-white text-center leading-tight line-clamp-3">
                {slide.preview}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">{slide.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
