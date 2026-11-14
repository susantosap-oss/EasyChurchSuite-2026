'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import type { RunningText } from '@/lib/outputBus'

/**
 * Ticker strip at the bottom of the live frame: white bar, black text scrolling across.
 * Speed is in frame widths per second, so the preview and the projector move alike.
 */
export function RunningTextOverlay({ runningText, width }: { runningText: RunningText; width: number }) {
  const textRef = useRef<HTMLSpanElement>(null)
  const [textW, setTextW] = useState(0)
  const fontSize = width * 0.032

  useLayoutEffect(() => {
    setTextW(textRef.current?.offsetWidth ?? 0)
  }, [runningText.text, fontSize])

  // One pass = the text travels fully off one edge to fully off the other
  const duration = (width + textW) / (Math.max(0.01, runningText.speed) * width)
  const name = runningText.direction === 'ltr' ? 'ec-ticker-ltr' : 'ec-ticker-rtl'

  return (
    <div className="absolute left-0 right-0 bottom-0 overflow-hidden"
      style={{ height: fontSize * 1.9, background: '#ffffff', zIndex: 20 }}>
      <style>{`
        @keyframes ec-ticker-ltr { from { transform: translateX(-100%) } to { transform: translateX(var(--ec-frame)) } }
        @keyframes ec-ticker-rtl { from { transform: translateX(var(--ec-frame)) } to { transform: translateX(-100%) } }
      `}</style>
      <span
        ref={textRef}
        key={`${runningText.text}|${runningText.direction}|${textW}`}
        className="absolute left-0 top-0 h-full flex items-center whitespace-nowrap"
        style={{
          ['--ec-frame' as string]: `${width}px`,
          color: '#000000',
          fontSize,
          fontWeight: 600,
          animation: textW ? `${name} ${duration}s linear infinite` : 'none',
          visibility: textW ? 'visible' : 'hidden',
          willChange: 'transform',
        }}
      >
        {runningText.text}
      </span>
    </div>
  )
}
