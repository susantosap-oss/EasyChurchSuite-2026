'use client'

import { useEffect, useState, type RefObject } from 'react'

/** Live width (CSS px) of an element — re-measured whenever it resizes */
export function useElementWidth(ref: RefObject<HTMLElement>, measure?: (el: HTMLElement) => number): number {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(Math.round(measure ? measure(el) : el.clientWidth))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])
  return width
}
