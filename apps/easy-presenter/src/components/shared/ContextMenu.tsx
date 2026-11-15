'use client'

import { useEffect, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'

/** Where a right-click happened, plus the operator UI's CSS zoom (useUiScale) at that element */
export interface MenuPos { x: number; y: number; zoom: number }

export interface MenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
}

/** Call from onContextMenu: stops the browser menu and returns where to open ours */
export function menuPosFrom(e: ReactMouseEvent<HTMLElement>): MenuPos {
  e.preventDefault()
  e.stopPropagation()
  const el = e.currentTarget
  const zoom = el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1
  return { x: e.clientX, y: e.clientY, zoom: zoom > 0.2 && zoom < 5 ? zoom : 1 }
}

const WIDTH = 190

/**
 * Right-click menu, rendered on <body> (outside the zoomed operator root) and zoomed itself so it
 * matches the UI size. Closes on outside click, Esc, scroll or window resize.
 */
export function ContextMenu({ pos, title, items, onClose }: {
  pos: MenuPos
  title?: string
  items: MenuItem[]
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onClose)
    window.addEventListener('scroll', onClose, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  const height = (items.length * 30 + (title ? 26 : 0) + 10) * pos.zoom
  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: 60 }}
      onMouseDown={onClose}
      onContextMenu={e => { e.preventDefault(); onClose() }}
    >
      <div
        className="fixed rounded-lg py-1 shadow-2xl"
        style={{
          zoom: pos.zoom,
          // zoom also scales left/top; flip towards the inside near the screen edges
          left: Math.max(0, Math.min(pos.x, window.innerWidth - WIDTH * pos.zoom)) / pos.zoom,
          top:  Math.max(0, pos.y + height > window.innerHeight ? pos.y - height : pos.y) / pos.zoom,
          width: WIDTH,
          background: '#1a2235',
          border: '1px solid #2a3347',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {title && <div className="px-3 py-1 text-[10px] truncate" style={{ color: '#64748b' }}>{title}</div>}
        {items.map(item => (
          <button
            key={item.label}
            onClick={() => { onClose(); item.onSelect() }}
            className="w-full text-left px-3 py-1.5 text-xs"
            style={{ color: item.danger ? '#fca5a5' : '#e2e8f0', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2a3347')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >{item.label}</button>
        ))}
      </div>
    </div>,
    document.body,
  )
}
