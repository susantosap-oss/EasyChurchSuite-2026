// HDMI matrix control over RS-232 (Wall mode: MT-VIKI MT-HD414 at the church).
//
// Uses .NET System.IO.Ports through powershell.exe instead of a native Node addon, so the
// installer stays small and nothing has to be rebuilt for Electron. Each send opens the port,
// writes the commands, collects whatever the matrix answers, and closes it again — the matrix
// is switched only a few times per service, so the ~1 s PowerShell start-up does not matter.

import { execFile } from 'child_process'

export interface SerialPortInfo { port: string; name: string }

export interface MatrixSendRequest {
  port: string
  baud: number
  /** One command per entry; escapes \r \n \t \\ and \xNN are decoded to bytes */
  commands: string[]
  /** Appended to every command */
  lineEnding: 'none' | 'cr' | 'lf' | 'crlf'
  /** Pause after each command (ms) — the matrix needs time to switch before the next one */
  gapMs?: number
}

export interface MatrixSendResult {
  ok: boolean
  error?: string
  /** Reply to each command, printable ASCII with \xNN for other bytes */
  replies: string[]
}

const ENDINGS: Record<MatrixSendRequest['lineEnding'], string> = { none: '', cr: '\r', lf: '\n', crlf: '\r\n' }

/** "LINK:O3I2;END\r\n" / "\xA5\x5B" → bytes */
export function decodeCommand(text: string): Buffer {
  const bytes: number[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (ch === '\\' && i + 1 < text.length) {
      const n = text[i + 1]!
      if (n === 'r') { bytes.push(13); i++; continue }
      if (n === 'n') { bytes.push(10); i++; continue }
      if (n === 't') { bytes.push(9); i++; continue }
      if (n === '\\') { bytes.push(92); i++; continue }
      if ((n === 'x' || n === 'X') && /^[0-9a-fA-F]{2}$/.test(text.slice(i + 2, i + 4))) {
        bytes.push(parseInt(text.slice(i + 2, i + 4), 16)); i += 3; continue
      }
    }
    for (const b of Buffer.from(ch, 'utf8')) bytes.push(b)
  }
  return Buffer.from(bytes)
}

function printable(buf: Buffer): string {
  let s = ''
  for (const b of buf) {
    if (b === 13) s += '\\r'
    else if (b === 10) s += '\\n'
    else if (b >= 32 && b < 127) s += String.fromCharCode(b)
    else s += '\\x' + b.toString(16).padStart(2, '0').toUpperCase()
  }
  return s
}

function powershell(script: string, env: Record<string, string>, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: timeoutMs, windowsHide: true, env: { ...process.env, ...env } },
      (err, stdout, stderr) => {
        if (err) reject(new Error((stderr || err.message).trim().split('\n')[0] ?? 'PowerShell gagal'))
        else resolve(stdout)
      })
  })
}

/** COM ports with their Device Manager names, e.g. { port: 'COM3', name: 'Prolific USB-to-Serial Comm Port (COM3)' } */
export async function listSerialPorts(): Promise<SerialPortInfo[]> {
  if (process.platform !== 'win32') return []
  const ps = [
    '$names = [System.IO.Ports.SerialPort]::GetPortNames() | Sort-Object -Unique;',
    '$pnp = @(Get-CimInstance Win32_PnPEntity -Filter "Name LIKE \'%(COM%\'" -ErrorAction SilentlyContinue);',
    'ConvertTo-Json -Compress -InputObject @($names | ForEach-Object { $p = $_;',
    '  $d = $pnp | Where-Object { $_.Name -like "*($p)*" } | Select-Object -First 1;',
    '  [pscustomobject]@{ port = $p; name = if ($d) { $d.Name } else { $p } } })',
  ].join(' ')
  try {
    const out = (await powershell(ps, {}, 15_000)).trim()
    if (!out) return []
    const parsed = JSON.parse(out) as SerialPortInfo | SerialPortInfo[]
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

// Commands go in as base64 (exact bytes, no quoting problems); replies come back as base64
const SEND_PS = [
  "$ErrorActionPreference = 'Stop';",
  "$p = New-Object System.IO.Ports.SerialPort $env:EC_PORT, ([int]$env:EC_BAUD), 'None', 8, 'One';",
  '$p.ReadTimeout = 500; $p.WriteTimeout = 2000; $p.Handshake = "None";',
  '$p.Open();',
  'try {',
  '  $out = @(foreach ($c in ($env:EC_CMDS -split ",")) {',
  '    if ($c -eq "") { continue }',
  '    $p.DiscardInBuffer();',
  '    $b = [Convert]::FromBase64String($c); $p.Write($b, 0, $b.Length);',
  '    Start-Sleep -Milliseconds ([int]$env:EC_GAP);',
  '    $n = $p.BytesToRead; $r = New-Object byte[] $n; if ($n -gt 0) { [void]$p.Read($r, 0, $n) };',
  '    [Convert]::ToBase64String($r) })',
  '} finally { $p.Close() }',
  'ConvertTo-Json -Compress -InputObject @($out)',
].join(' ')

let queue: Promise<unknown> = Promise.resolve()

/** Send commands one after another; calls are serialized so two sends never fight over the port */
export function sendMatrix(req: MatrixSendRequest): Promise<MatrixSendResult> {
  const run = async (): Promise<MatrixSendResult> => {
    if (process.platform !== 'win32') return { ok: false, error: 'Kontrol RS-232 hanya tersedia di Windows', replies: [] }
    if (!/^COM\d+$/i.test(req.port)) return { ok: false, error: 'Pilih port COM dulu', replies: [] }
    const ending = ENDINGS[req.lineEnding] ?? ''
    const cmds = req.commands.map(c => c.trim()).filter(Boolean)
    if (!cmds.length) return { ok: false, error: 'Tidak ada perintah', replies: [] }
    const gap = Math.max(50, Math.min(3000, req.gapMs ?? 300))
    try {
      const out = (await powershell(SEND_PS, {
        EC_PORT: req.port.toUpperCase(),
        EC_BAUD: String(req.baud || 9600),
        EC_GAP: String(gap),
        EC_CMDS: cmds.map(c => decodeCommand(c + ending).toString('base64')).join(','),
      }, 10_000 + cmds.length * gap)).trim()
      const parsed = out ? JSON.parse(out) as string | string[] : []
      const replies = (Array.isArray(parsed) ? parsed : [parsed]).map(b => printable(Buffer.from(b, 'base64')))
      return { ok: true, replies }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const friendly = /does not exist|tidak ada/i.test(msg) ? `Port ${req.port} tidak ditemukan — kabel USB-RS232 tercolok?`
        : /denied|ditolak|in use/i.test(msg) ? `Port ${req.port} sedang dipakai program lain`
        : msg
      return { ok: false, error: friendly, replies: [] }
    }
  }
  const p = queue.then(run, run)
  queue = p.catch(() => undefined)
  return p
}
