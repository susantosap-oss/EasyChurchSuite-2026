'use client'

import { useEffect, useState } from 'react'

/**
 * Warns the operator when Windows shows only one screen — usually the projector is unplugged
 * or Windows is in Duplicate mode, so there is nowhere to put the output window.
 * Desktop app only; hidden again as soon as a second screen appears.
 */
export function SecondScreenNotice({ enabled }: { enabled: boolean }) {
  const [screens, setScreens]     = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    const refresh = () => {
      api.getDisplays().then(d => {
        setScreens(d.length)
        setDismissed(false)   // a change in screens shows the notice again if still needed
      }).catch(() => {})
    }
    refresh()
    return api.onDisplaysChanged?.(refresh)
  }, [])

  if (!enabled || dismissed || screens == null || screens > 1) return null

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 text-xs flex-shrink-0"
      style={{ background: '#422006', borderBottom: '1px solid #854d0e', color: '#fde68a' }}>
      <span className="font-semibold">Proyektor / TV belum terdeteksi sebagai layar kedua.</span>
      <span style={{ color: '#fcd34d' }}>
        Colok kabel HDMI, lalu tekan <b>Win + P</b> → pilih <b>Extend</b> (bukan Duplicate).
      </span>
      <div className="flex-1" />
      <button onClick={() => setDismissed(true)} className="px-2 rounded hover:bg-black/20" title="Tutup">✕</button>
    </div>
  )
}
