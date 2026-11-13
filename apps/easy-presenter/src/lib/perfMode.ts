'use client'
// Low-spec mode flag shared by the operator and output windows (set from Settings ⚙ → Performa)
import { useSyncExternalStore } from 'react'

let lowSpec = false
const listeners = new Set<() => void>()

export function setLowSpec(v: boolean) {
  if (v === lowSpec) return
  lowSpec = v
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('ec-lowspec', v)
  listeners.forEach(l => l())
}

export function useLowSpec(): boolean {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb) },
    () => lowSpec,
    () => false,
  )
}
