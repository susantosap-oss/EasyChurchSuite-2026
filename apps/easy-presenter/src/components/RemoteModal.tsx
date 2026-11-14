'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type Role = 'operator' | 'speaker'

const ROLES: { role: Role; title: string; note: string; color: string }[] = [
  { role: 'operator', title: 'Operator', note: 'Kontrol slide, Go Live, Blank, Clear & Urutan Ibadah dari HP', color: '#3b82f6' },
  { role: 'speaker',  title: 'Speaker',  note: 'Layar untuk pembicara / worship leader: slide sekarang, berikutnya & jam', color: '#f59e0b' },
]

/** 📱 Remote — QR codes / links for the phone Operator and Speaker pages */
export function RemoteModal({ clients, onClose }: { clients: RemoteInfo['clients']; onClose: () => void }) {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.remoteInfo
  const [info, setInfo]       = useState<RemoteInfo | null | undefined>(undefined)
  const [addrIdx, setAddrIdx] = useState(0)
  const [qr, setQr]           = useState<Partial<Record<Role, string>>>({})
  const [copied, setCopied]   = useState<Role | null>(null)
  const [confirmNew, setConfirmNew] = useState(false)

  useEffect(() => {
    if (!isElectron) { setInfo(null); return }
    window.electronAPI!.remoteInfo!().then(setInfo).catch(() => setInfo(null))
  }, [isElectron])

  const address = info?.addresses[addrIdx]?.address
  const urlFor = (role: Role) => info && address ? `http://${address}:${info.port}/r?k=${info.keys[role]}` : ''

  useEffect(() => {
    if (!info || !address) return
    const opts = { margin: 1, width: 220, color: { dark: '#0f172a', light: '#ffffff' } }
    Promise.all(ROLES.map(r => QRCode.toDataURL(urlFor(r.role), opts)))
      .then(([op, sp]) => setQr({ operator: op, speaker: sp }))
      .catch(() => setQr({}))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, address])

  const copy = (role: Role) => {
    navigator.clipboard?.writeText(urlFor(role)).then(() => {
      setCopied(role)
      setTimeout(() => setCopied(null), 1500)
    }).catch(() => {})
  }

  const regenerate = async () => {
    if (!confirmNew) { setConfirmNew(true); setTimeout(() => setConfirmNew(false), 3000); return }
    setConfirmNew(false)
    const next = await window.electronAPI?.remoteRegenerate?.()
    if (next) setInfo(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="rounded-xl w-[640px] max-w-[95vw] max-h-[92vh] overflow-y-auto"
        style={{ background: '#0f1117', border: '1px solid #2a3347' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 h-11" style={{ borderBottom: '1px solid #2a3347', background: '#161b27' }}>
          <span className="text-sm font-semibold">📱 Remote HP</span>
          <div className="flex-1" />
          <button onClick={onClose} className="text-lg leading-none" style={{ color: '#475569' }}>×</button>
        </div>

        <div className="p-4 space-y-3">
          {info === undefined && <p className="text-xs" style={{ color: '#64748b' }}>Memuat…</p>}

          {info === null && (
            <p className="text-xs" style={{ color: '#fca5a5' }}>
              {isElectron
                ? 'Server remote tidak berjalan (port 3902–3911 terpakai). Tutup aplikasi lain yang memakai port tersebut lalu buka ulang EasyChurch Suite.'
                : 'Remote HP hanya tersedia di aplikasi desktop EasyChurch Suite.'}
            </p>
          )}

          {info && !info.addresses.length && (
            <p className="text-xs" style={{ color: '#fca5a5' }}>
              PC ini belum terhubung ke jaringan Wi-Fi / LAN. Sambungkan PC dan HP ke Wi-Fi yang sama.
            </p>
          )}

          {info && info.addresses.length > 0 && (
            <>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                Sambungkan HP ke <b style={{ color: '#fff' }}>Wi-Fi yang sama</b> dengan PC ini, lalu scan QR code dengan kamera HP.
                Agar seperti aplikasi: buka menu browser → <b style={{ color: '#fff' }}>Tambahkan ke Layar Utama</b>.
              </p>

              {info.addresses.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span style={{ color: '#64748b' }}>Jaringan</span>
                  <select value={addrIdx} onChange={e => setAddrIdx(Number(e.target.value))}
                    className="flex-1 px-2 py-1 rounded focus:outline-none"
                    style={{ background: '#1e2535', border: '1px solid #2a3347', color: '#e2e8f0' }}>
                    {info.addresses.map((a, i) => <option key={a.address} value={i}>{a.name} — {a.address}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {ROLES.map(r => (
                  <div key={r.role} className="rounded-xl p-3 flex flex-col items-center gap-2"
                    style={{ background: '#161b27', border: `1px solid ${r.color}55` }}>
                    <div className="flex items-center gap-2 self-stretch">
                      <span className="text-sm font-bold" style={{ color: r.color }}>{r.title}</span>
                      <div className="flex-1" />
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: clients[r.role] ? '#14532d' : '#1e2535', color: clients[r.role] ? '#86efac' : '#64748b' }}>
                        {clients[r.role]} terhubung
                      </span>
                    </div>
                    {qr[r.role]
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={qr[r.role]} alt={`QR ${r.title}`} width={180} height={180} className="rounded-lg" />
                      : <div className="w-[180px] h-[180px] rounded-lg" style={{ background: '#1e2535' }} />}
                    <p className="text-[10px] text-center leading-snug" style={{ color: '#64748b' }}>{r.note}</p>
                    <div className="flex items-center gap-1 self-stretch">
                      <input readOnly value={urlFor(r.role)} onFocus={e => e.currentTarget.select()}
                        className="flex-1 min-w-0 px-2 py-1 rounded text-[10px] font-mono focus:outline-none"
                        style={{ background: '#0f1117', border: '1px solid #2a3347', color: '#94a3b8' }} />
                      <button onClick={() => copy(r.role)} className="px-2 py-1 rounded text-[10px] flex-shrink-0"
                        style={{ background: '#1e2535', color: copied === r.role ? '#86efac' : '#e2e8f0', border: '1px solid #2a3347' }}>
                        {copied === r.role ? '✓ Disalin' : 'Salin'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg p-3 text-[11px] space-y-1" style={{ background: '#161b27', color: '#64748b' }}>
                <p>• Pertama kali, Windows bisa bertanya izin jaringan — pilih <b style={{ color: '#cbd5e1' }}>Allow / Izinkan</b> untuk jaringan Private.</p>
                <p>• Link Speaker hanya bisa melihat; hanya link Operator yang bisa mengontrol.</p>
                <p>• Untuk Speaker, atur layar HP agar tidak terkunci otomatis selama ibadah.</p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={regenerate} className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: confirmNew ? '#7f1d1d' : '#1e2535', color: confirmNew ? '#fecaca' : '#94a3b8', border: '1px solid #2a3347' }}>
                  {confirmNew ? 'Klik lagi untuk mengganti kunci' : '🔑 Ganti kunci link'}
                </button>
                <span className="text-[10px]" style={{ color: '#475569' }}>
                  Link lama berhenti berfungsi — HP harus scan ulang. Pakai bila link tersebar ke orang lain.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
