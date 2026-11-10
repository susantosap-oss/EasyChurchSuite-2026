'use client'

import { useEffect, useState } from 'react'
import type { LowerThirdStyle } from '@/types/electron'

interface LowerThirdState {
  visible: boolean
  name: string
  title: string
  subtitle: string
  style: LowerThirdStyle
}

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  'bottom-left':   { bottom: '10%', left: '5%' },
  'bottom-center': { bottom: '10%', left: '50%', transform: 'translateX(-50%)' },
  'bottom-right':  { bottom: '10%', right: '5%' },
  'top-left':      { top: '5%', left: '5%' },
  'top-right':     { top: '5%', right: '5%' },
}

export default function OverlayPage() {
  const [state, setState] = useState<LowerThirdState>({
    visible: false,
    name: '',
    title: '',
    subtitle: '',
    style: {
      bgColor: '#1e3a5f',
      textColor: '#ffffff',
      accentColor: '#3b82f6',
      position: 'bottom-left',
      animation: 'slide-up',
    },
  })

  useEffect(() => {
    const cleanup = window.studioAPI?.onOverlayCommand((raw) => {
      const cmd = raw as { type: string; name?: string; title?: string; subtitle?: string; style?: LowerThirdStyle }
      if (cmd.type === 'clear') {
        setState(s => ({ ...s, visible: false }))
      } else if (cmd.type === 'lower-third') {
        setState({
          visible: true,
          name: cmd.name ?? '',
          title: cmd.title ?? '',
          subtitle: cmd.subtitle ?? '',
          style: cmd.style ?? state.style,
        })
      }
    })
    return cleanup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const posStyle = POSITION_STYLES[state.style.position] ?? POSITION_STYLES['bottom-left']

  return (
    // Full transparent window — only lower third renders
    <div className="w-screen h-screen overflow-hidden" style={{ background: 'transparent' }}>
      {state.visible && (
        <div
          className="absolute"
          style={{
            ...posStyle,
            animation: state.style.animation === 'slide-up'
              ? 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards'
              : state.style.animation === 'fade'
                ? 'fadeIn 0.4s ease forwards'
                : undefined,
          }}
        >
          <div
            style={{
              backgroundColor: state.style.bgColor,
              borderLeft: `5px solid ${state.style.accentColor}`,
              minWidth: '320px',
              maxWidth: '600px',
            }}
            className="rounded-sm overflow-hidden shadow-2xl"
          >
            <div className="px-5 pt-3 pb-2">
              <p className="text-2xl font-bold leading-tight" style={{ color: state.style.textColor }}>
                {state.name}
              </p>
            </div>
            {(state.title || state.subtitle) && (
              <div
                className="px-5 pb-3"
                style={{ backgroundColor: `${state.style.accentColor}30` }}
              >
                <p className="text-base" style={{ color: state.style.textColor + 'CC' }}>
                  {state.title}{state.subtitle ? ` · ${state.subtitle}` : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideUp { from { transform: translateY(30px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}
