'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Operator UI auto-fit.
 *
 * The layout is designed for a 1536×864 work area (1920×1080 at 125% Windows scaling).
 * Larger / higher-resolution work areas (e.g. 1920×1080 at 100%, 2560×1440, 4K) are zoomed
 * up so panels, text and thumbnails keep the same proportions instead of turning tiny.
 * Smaller screens are NOT zoomed down — the panels have minimum sizes and scroll instead,
 * so text never becomes unreadable.
 *
 * The operator can override it: Ctrl + = / Ctrl + − (step 10%), Ctrl + 0 = back to automatic.
 * The choice is stored per PC (localStorage) because it depends on that PC's monitor.
 *
 * Applied as CSS `zoom` on the operator root, not Electron's webContents zoom: Chromium zooms
 * per origin, which would also zoom the full-screen output windows.
 */

const DESIGN_W = 1536
const DESIGN_H = 864
const AUTO_MAX = 2
const MANUAL_MIN = 0.7
const MANUAL_MAX = 2
const STEP = 0.1
const STORAGE_KEY = 'ec.uiScale'

export type UiScaleMode = 'auto' | number

const round = (n: number) => Math.round(n * 20) / 20   // 5% steps

function autoScale(): number {
  if (typeof window === 'undefined') return 1
  const z = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)
  return round(Math.min(AUTO_MAX, Math.max(1, z)))
}

function readMode(): UiScaleMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    const n = v == null || v === 'auto' ? NaN : Number(v)
    return Number.isFinite(n) ? Math.min(MANUAL_MAX, Math.max(MANUAL_MIN, n)) : 'auto'
  } catch { return 'auto' }
}

function writeMode(mode: UiScaleMode) {
  try { localStorage.setItem(STORAGE_KEY, String(mode)) } catch { /* storage blocked — session only */ }
}

export function useUiScale() {
  const [mode, setModeState] = useState<UiScaleMode>('auto')
  const [auto, setAuto]      = useState(1)
  /** Bumped on every manual change so the UI can flash the new percentage */
  const [changedAt, setChangedAt] = useState(0)

  useEffect(() => {
    setModeState(readMode())
    const update = () => setAuto(autoScale())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const zoom = mode === 'auto' ? auto : mode

  const setMode = useCallback((next: UiScaleMode) => {
    setModeState(next)
    writeMode(next)
    setChangedAt(Date.now())
  }, [])

  // Ctrl + = / Ctrl + − / Ctrl + 0. preventDefault also stops Electron's default menu zoom
  // (which would zoom the output windows too).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.altKey || e.metaKey) return
      const k = e.key
      if (k === '=' || k === '+' || e.code === 'NumpadAdd') {
        e.preventDefault()
        setMode(round(Math.min(MANUAL_MAX, zoom + STEP)))
      } else if (k === '-' || k === '_' || e.code === 'NumpadSubtract') {
        e.preventDefault()
        setMode(round(Math.max(MANUAL_MIN, zoom - STEP)))
      } else if (k === '0' || e.code === 'Numpad0') {
        e.preventDefault()
        setMode('auto')
      }
    }
    // Ctrl + mouse wheel would otherwise trigger Chromium's per-origin page zoom
    const onWheel = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onWheel)
    }
  }, [zoom, setMode])

  return { zoom, mode, setMode, changedAt }
}
