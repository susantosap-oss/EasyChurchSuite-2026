// PPTX / PPT → PDF with an office suite on this PC — PowerPoint, then WPS Office, then LibreOffice —
// so presentations go through the same PDF → slides path as uploaded PDFs. Jobs share the media
// conversion job list (ffmpeg.server.ts) so the library shows their state the same way.
import { execFile } from 'child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { join, extname } from 'path'
import { pathToFileURL } from 'url'
import type { ConvertJob } from './ffmpeg.server'
import { extractEmbeddedFonts, withTemporaryFonts } from './officeFonts.server'

export type OfficeEngine = 'PowerPoint' | 'WPS' | 'LibreOffice'

const g = globalThis as typeof globalThis & {
  __ecJobs?: Map<string, ConvertJob>
  __ecOfficeQueue?: Promise<void>
}
const jobs = (g.__ecJobs ??= new Map())

const COM_TIMEOUT          = 120_000   // an unlicensed / blocked suite must not hang the queue
const LIBREOFFICE_TIMEOUT  = 180_000

export const OFFICE_HELP =
  'Pasang LibreOffice (gratis, libreoffice.org) atau aktifkan PowerPoint / WPS, lalu klik → PDF. Bisa juga ekspor PDF dari PowerPoint / Canva.'

function run(cmd: string, args: string[], timeout: number, env?: Record<string, string>): Promise<{ code: number; out: string }> {
  return new Promise(resolve => {
    execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 1024 * 1024, env: { ...process.env, ...env } }, (err, stdout, stderr) => {
      const code = err ? (typeof (err as { code?: unknown }).code === 'number' ? (err as { code: number }).code : 1) : 0
      resolve({ code, out: `${stdout}\n${stderr}`.trim() })
    })
  })
}

const regExists = async (key: string) =>
  process.platform === 'win32' && (await run('reg', ['query', key], 5000)).code === 0

/** EASYCHURCH_OFFICE_ENGINE=PowerPoint|WPS|LibreOffice limits conversion to one suite (e.g. a PC whose PowerPoint misbehaves) */
const allowed = (engine: OfficeEngine) => {
  const only = process.env.EASYCHURCH_OFFICE_ENGINE?.trim().toLowerCase()
  return !only || only === engine.toLowerCase()
}

/** PowerPoint is registered on this PC (whether it is licensed only shows when it runs) */
const hasPowerPoint = async () =>
  allowed('PowerPoint') && regExists('HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\POWERPNT.EXE')
/** WPS Presentation's automation object (same object model as PowerPoint) */
const hasWps = async () => allowed('WPS') && regExists('HKCR\\KWPP.Application')

function findLibreOffice(): string | null {
  if (!allowed('LibreOffice')) return null
  const candidates = [
    process.env.LIBREOFFICE_PATH,
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/usr/bin/soffice', '/usr/local/bin/soffice', '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  ]
  return candidates.find(p => p && existsSync(p)) ?? null
}

export async function availableEngines(): Promise<OfficeEngine[]> {
  const list: OfficeEngine[] = []
  if (await hasPowerPoint()) list.push('PowerPoint')
  if (await hasWps()) list.push('WPS')
  if (findLibreOffice()) list.push('LibreOffice')
  return list
}

/**
 * PowerPoint / WPS, hidden, through COM: open read-only without a window, save as PDF
 * (ppSaveAsPDF = 32; ExportAsFixedFormat as a fallback for suites that only support that).
 */
const COM_SCRIPT = `
$ErrorActionPreference = 'Stop'
$app = New-Object -ComObject $env:EC_PROGID
try {
  $deck = $app.Presentations.Open($env:EC_IN, -1, 0, 0)
  try {
    try { $deck.SaveAs($env:EC_OUT, 32) } catch { $deck.ExportAsFixedFormat($env:EC_OUT, 2) }
  } finally { $deck.Close() }
} finally {
  # Quit only when this script started the program — never close the operator's own presentations.
  # Errors here must not hide the real one above.
  try { if ($app.Presentations.Count -eq 0) { $app.Quit() } } catch {}
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
`

/** COM errors an unlicensed Office gives: files open by hand, but not for automation */
const UNLICENSED = /0x80048240|0x8004824|licen|activat/i

async function viaCom(engine: 'PowerPoint' | 'WPS', input: string, output: string): Promise<void> {
  const progId = engine === 'PowerPoint' ? 'PowerPoint.Application' : 'KWPP.Application'
  const r = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', COM_SCRIPT],
    COM_TIMEOUT, { EC_PROGID: progId, EC_IN: input, EC_OUT: output })
  if (r.code !== 0 || !existsSync(output)) {
    if (UNLICENSED.test(r.out)) throw new Error(`${engine}: lisensi tidak aktif (tidak bisa dipakai otomatis)`)
    const line = r.out.split('\n').map(s => s.trim()).filter(Boolean).find(s => !s.startsWith('At ') && !s.startsWith('+')) ?? ''
    throw new Error(`${engine}: ${line || 'tidak bisa menyimpan PDF'}`)
  }
}

/** LibreOffice headless, with its own throwaway profile so an open LibreOffice window is not disturbed */
async function viaLibreOffice(soffice: string, input: string, output: string, workDir: string): Promise<void> {
  const outDir  = join(workDir, 'out')
  mkdirSync(outDir, { recursive: true })
  const r = await run(soffice, [
    // A proper file URL: the data folder ("…\EasyChurch Suite\…") has spaces, which must be %20-encoded
    `-env:UserInstallation=${pathToFileURL(join(workDir, 'profile')).href}`,
    '--headless', '--norestore', '--nologo', '--convert-to', 'pdf', '--outdir', outDir, input,
  ], LIBREOFFICE_TIMEOUT)
  const pdf = readdirSync(outDir).find(f => extname(f).toLowerCase() === '.pdf')
  if (r.code !== 0 || !pdf) throw new Error(`LibreOffice: ${r.out.split('\n').pop() || `konversi gagal (kode ${r.code})`}`)
  renameSync(join(outDir, pdf), output)
}

/**
 * A presentation marked ✓ Speaker stays marked after it becomes a PDF: the mark moves to the PDF with
 * no pages yet — the Media library renders them (pdf.js runs in the browser, not here).
 */
function moveSpeakerMark(dir: string, from: string, to: string) {
  const store = join(dir, '..', 'speaker-media.json')
  try {
    const decks = JSON.parse(readFileSync(store, 'utf8')) as { file: string; name: string; kind: string; url: string; pages: string[] }[]
    const marked = decks.find(d => d.file === from)
    if (!marked) return
    const pdf = { file: to, name: marked.name, kind: 'pdf', url: `/api/media/file/${encodeURIComponent(to)}`, pages: [] as string[] }
    writeFileSync(store, JSON.stringify([...decks.filter(d => d.file !== from && d.file !== to), pdf], null, 2))
  } catch { /* no Speaker list yet */ }
}

/**
 * Queue PPTX → PDF for a stored media file. One at a time. On success the PDF is added to the
 * library and the presentation file removed; on failure the file stays with the error on its job.
 */
export function enqueueOfficeConversion(dir: string, file: string): ConvertJob {
  const base   = file.replace(/^\d+_/, '').replace(/\.[^.]+$/, '')
  const target = `${Date.now()}_${base}.pdf`
  const job: ConvertJob = { file, target, state: 'queued', progress: 0, reasons: ['Presentasi → PDF'] }
  jobs.set(file, job)

  g.__ecOfficeQueue = (g.__ecOfficeQueue ?? Promise.resolve()).then(async () => {
    const input   = join(dir, file)
    const output  = join(dir, target)
    const workDir = join(dir, `.office-${Date.now()}`)   // hidden: never listed in the library
    job.state = 'converting'
    mkdirSync(workDir, { recursive: true })
    try {
      const errors: string[] = []
      const fail = (err: unknown) => errors.push(err instanceof Error ? err.message : String(err))
      // WPS and LibreOffice ignore fonts embedded in the PPTX — hand them over for the conversion
      let fonts: string[] | null = null
      const embeddedFonts = async () => (fonts ??= await extractEmbeddedFonts(input, join(workDir, 'fonts')))
      let done = false

      for (const engine of ['PowerPoint', 'WPS'] as const) {
        if (done || !(engine === 'PowerPoint' ? await hasPowerPoint() : await hasWps())) continue
        job.encoder = engine
        // Written inside the work folder first, so a half-written PDF never shows in the library
        const tmp = join(workDir, `${engine}.pdf`)
        try {
          if (engine === 'PowerPoint') await viaCom(engine, input, tmp)
          else await withTemporaryFonts(await embeddedFonts(), () => viaCom(engine, input, tmp))
          renameSync(tmp, output)
          done = true
        } catch (err) { fail(err) }
      }

      const soffice = done ? null : findLibreOffice()
      if (soffice) {
        job.encoder = 'LibreOffice'
        try {
          await withTemporaryFonts(await embeddedFonts(), () => viaLibreOffice(soffice, input, output, workDir))
          done = true
        } catch (err) { fail(err) }
      }

      if (!done) {
        throw new Error(errors.length
          ? `${errors.join(' · ')} — ${OFFICE_HELP}`
          : `Tidak ada PowerPoint / WPS / LibreOffice. ${OFFICE_HELP}`)
      }
      if (existsSync(input)) unlinkSync(input)
      moveSpeakerMark(dir, file, target)
      job.state = 'done'
      job.progress = 1
    } catch (err) {
      if (existsSync(output)) unlinkSync(output)
      job.state = 'error'
      job.error = err instanceof Error ? err.message : String(err)
    } finally {
      rmSync(workDir, { recursive: true, force: true })
    }
  })
  return job
}
