'use client'

import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_APP_SETTINGS, normalizeSettings, type AppSettings } from './appSettings'
import { setLowSpec } from '@/lib/perfMode'

/** Load / save app settings; also pushes display + performance settings to Electron (if running) */
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [loaded, setLoaded]     = useState(false)

  useEffect(() => {
    fetch('/api/settings/')
      .then(r => r.json() as Promise<{ settings?: Partial<AppSettings> | null }>)
      .then(d => {
        const s = normalizeSettings(d.settings)
        setSettings(s)
        setLowSpec(s.performance.lowSpecMode)
        window.electronAPI?.applyNativeSettings?.({ output: s.output, performance: s.performance })
      })
      .catch(() => { /* keep defaults */ })
      .finally(() => setLoaded(true))
  }, [])

  const save = useCallback(async (next: AppSettings) => {
    const res  = await fetch('/api/settings/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: next }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok || data.error) throw new Error(data.error ?? 'Gagal menyimpan settings')
    setSettings(next)
    setLowSpec(next.performance.lowSpecMode)
    window.electronAPI?.applyNativeSettings?.({ output: next.output, performance: next.performance })
  }, [])

  return { settings, loaded, save }
}
