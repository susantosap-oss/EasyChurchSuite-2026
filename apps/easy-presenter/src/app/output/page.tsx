'use client'

import { useEffect, useState } from 'react'

interface SlideCommand {
  type: 'show' | 'blank' | 'clear'
  text?: string
  reference?: string
  background?: string
}

export default function OutputPage() {
  const [slide, setSlide] = useState<SlideCommand | null>(null)
  const [isBlank, setIsBlank] = useState(false)

  useEffect(() => {
    const cleanup = window.electronAPI?.onSlideCommand((data) => {
      const cmd = data as SlideCommand
      if (cmd.type === 'blank') setIsBlank(true)
      else if (cmd.type === 'clear') { setIsBlank(false); setSlide(null) }
      else { setIsBlank(false); setSlide(cmd) }
    })
    return cleanup
  }, [])

  return (
    <div
      className="w-screen h-screen bg-black flex flex-col items-center justify-center overflow-hidden"
      style={{ cursor: 'none' }}
    >
      {!isBlank && slide && (
        <>
          {slide.background && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.background})`, filter: 'brightness(0.4)' }}
            />
          )}
          <div className="relative z-10 max-w-5xl px-16 text-center">
            <p
              className="text-white font-light leading-relaxed"
              style={{
                fontSize: 'clamp(32px, 5vw, 72px)',
                textShadow: '0 2px 20px rgba(0,0,0,0.8)',
              }}
            >
              {slide.text}
            </p>
            {slide.reference && (
              <p
                className="text-slate-300 mt-6 font-medium"
                style={{ fontSize: 'clamp(18px, 2.5vw, 36px)' }}
              >
                {slide.reference}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
