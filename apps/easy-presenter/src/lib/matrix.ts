// Switch the HDMI matrix for Wall ON / OFF (renderer side; the RS-232 work happens in Electron)
import { describeRoutes, matrixCommands, type MatrixSettings, type MatrixRoute } from '@/components/settings/appSettings'

export interface MatrixOutcome {
  ok: boolean
  /** Shown to the operator */
  message: string
  /** Sent command → reply, for the Settings log */
  log: { sent: string; reply: string }[]
}

export async function sendMatrixCommands(m: MatrixSettings, commands: string[]): Promise<MatrixOutcome> {
  const api = window.electronAPI
  if (!api?.matrixSend) return { ok: false, message: 'Kontrol RS-232 hanya tersedia di aplikasi desktop', log: [] }
  const res = await api.matrixSend({ port: m.port, baud: m.baud, commands, lineEnding: m.lineEnding, gapMs: m.gapMs })
  const log = commands.map((sent, i) => ({ sent, reply: res.replies[i] ?? '' }))
  return { ok: res.ok, message: res.ok ? 'Terkirim' : (res.error ?? 'Gagal mengirim'), log }
}

/** Apply the Wall ON / OFF routes. Manual control only returns the reminder text. */
export async function switchWall(m: MatrixSettings, on: boolean): Promise<MatrixOutcome> {
  const routes: MatrixRoute[] = on ? m.wallOn : m.wallOff
  const what = describeRoutes(routes)
  if (m.control === 'manual') {
    return { ok: true, message: `Atur matrix secara manual: ${what}`, log: [] }
  }
  if (m.control !== 'serial') return { ok: true, message: '', log: [] }
  const r = await sendMatrixCommands(m, matrixCommands(m, routes))
  return { ...r, message: r.ok ? `Matrix: ${what}` : `Matrix gagal: ${r.message}` }
}
