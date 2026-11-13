// Server-only: FFmpeg detection, video probing and background H.264 conversion for low-end playback PCs.
import { execFile, spawn } from 'child_process'
import { existsSync, renameSync, unlinkSync } from 'fs'
import { join } from 'path'
import type { VideoLimits } from '@/components/settings/appSettings'

export interface FfmpegInfo { path: string; version: string }

export interface VideoInfo {
  codec: string
  width: number
  height: number
  fps: number
  bitrateKbps: number   // stream bitrate, or container bitrate when the stream has none
  durationSec: number
}

export interface ConvertJob {
  file: string            // source (stored name in the media folder)
  target: string          // converted file name
  state: 'queued' | 'converting' | 'done' | 'error'
  progress: number        // 0–1
  reasons: string[]
  encoder?: string
  error?: string
}

// Module state lives on globalThis so every route bundle shares it (and it survives dev hot reloads)
const g = globalThis as typeof globalThis & {
  __ecFfmpeg?: { at: number; info: FfmpegInfo | null }
  __ecEncoder?: string
  __ecJobs?: Map<string, ConvertJob>
  __ecQueue?: Promise<void>
}
const jobs = (g.__ecJobs ??= new Map())

function run(cmd: string, args: string[], timeout = 8000): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise(resolve => {
    execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      const code = err ? (typeof (err as { code?: unknown }).code === 'number' ? (err as { code: number }).code : 1) : 0
      resolve({ code, stdout: String(stdout), stderr: String(stderr) })
    })
  })
}

/**
 * Find a working FFmpeg: FFMPEG_PATH → bundled with the installed app (EASYCHURCH_FFMPEG / resources/ffmpeg)
 * → PATH. Result is cached (a miss only for one minute, so installing FFmpeg is picked up quickly).
 */
export async function resolveFfmpeg(): Promise<FfmpegInfo | null> {
  const cached = g.__ecFfmpeg
  if (cached && (cached.info || Date.now() - cached.at < 60_000)) return cached.info

  const exe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const candidates = [
    process.env.FFMPEG_PATH,
    process.env.EASYCHURCH_FFMPEG,
    join(process.cwd(), 'resources', 'ffmpeg', exe),
    'ffmpeg',
  ].filter((c): c is string => !!c && (c === 'ffmpeg' || existsSync(c)))

  let info: FfmpegInfo | null = null
  for (const c of candidates) {
    const r = await run(c, ['-hide_banner', '-version'])
    const m = r.stdout.match(/ffmpeg version (\S+)/)
    if (r.code === 0 && m) { info = { path: c, version: m[1]! }; break }
  }
  g.__ecFfmpeg = { at: Date.now(), info }
  return info
}

/** Read codec / resolution / fps / bitrate from `ffmpeg -i` (no ffprobe needed) */
export async function probeVideo(ff: FfmpegInfo, file: string): Promise<VideoInfo | null> {
  const { stderr } = await run(ff.path, ['-hide_banner', '-i', file], 15_000)
  const stream = stderr.split('\n').find(l => /Stream #\d+:\d+.*: Video:/.test(l))
  if (!stream) return null
  const codec = stream.match(/Video: (\w+)/)?.[1] ?? 'unknown'
  const size  = stream.match(/, (\d{2,5})x(\d{2,5})[,\s]/)
  const fps   = parseFloat(stream.match(/([\d.]+) fps/)?.[1] ?? stream.match(/([\d.]+) tbr/)?.[1] ?? '0')
  const sbr   = parseInt(stream.match(/(\d+) kb\/s/)?.[1] ?? '0', 10)
  const dur   = stderr.match(/Duration: (\d+):(\d+):([\d.]+)/)
  const cbr   = parseInt(stderr.match(/bitrate: (\d+) kb\/s/)?.[1] ?? '0', 10)
  return {
    codec,
    width:  size ? parseInt(size[1]!, 10) : 0,
    height: size ? parseInt(size[2]!, 10) : 0,
    fps,
    bitrateKbps: sbr || cbr,
    durationSec: dur ? parseInt(dur[1]!, 10) * 3600 + parseInt(dur[2]!, 10) * 60 + parseFloat(dur[3]!) : 0,
  }
}

/** Containers Chromium cannot play at all — always converted */
export const CONVERT_ONLY_EXT = new Set(['.avi', '.mkv', '.wmv', '.mpg', '.mpeg', '.flv', '.3gp', '.ts', '.mts', '.m2ts'])
// H.264 / VP8 / VP9 decode in hardware on practically every GPU from the last decade
const LIGHT_CODECS = new Set(['h264', 'vp8', 'vp9'])

/** Why a video should be converted for smooth playback (empty = play as is) */
export function conversionReasons(info: VideoInfo, limits: VideoLimits, ext: string): string[] {
  const r: string[] = []
  if (CONVERT_ONLY_EXT.has(ext)) r.push(`format ${ext} tidak bisa diputar langsung`)
  if (!LIGHT_CODECS.has(info.codec)) r.push(`codec ${info.codec.toUpperCase()} berat / tidak didukung`)
  if (info.height > limits.maxHeight) r.push(`resolusi ${info.height}p > ${limits.maxHeight}p`)
  if (info.bitrateKbps > limits.maxBitrateKbps) r.push(`bitrate ${(info.bitrateKbps / 1000).toFixed(1)} Mbps > ${limits.maxBitrateKbps / 1000} Mbps`)
  if (info.fps > limits.maxFps + 0.5) r.push(`${Math.round(info.fps)} fps > ${limits.maxFps} fps`)
  return r
}

/** Pick the fastest H.264 encoder that actually works on this PC (Intel QSV / NVIDIA NVENC / AMD AMF / CPU) */
export async function pickEncoder(ff: FfmpegInfo): Promise<string> {
  if (g.__ecEncoder) return g.__ecEncoder
  for (const enc of ['h264_nvenc', 'h264_qsv', 'h264_amf']) {
    const r = await run(ff.path, [
      '-hide_banner', '-f', 'lavfi', '-i', 'color=c=black:s=320x240:d=0.2',
      '-pix_fmt', enc === 'h264_qsv' ? 'nv12' : 'yuv420p', '-c:v', enc, '-f', 'null', '-',
    ], 15_000)
    if (r.code === 0) { g.__ecEncoder = enc; return enc }
  }
  g.__ecEncoder = 'libx264'
  return 'libx264'
}

function encoderArgs(enc: string, maxKbps: number): string[] {
  const rate = ['-maxrate', `${maxKbps}k`, '-bufsize', `${maxKbps * 2}k`]
  switch (enc) {
    case 'h264_nvenc': return ['-c:v', enc, '-preset', 'p4', '-rc', 'vbr', '-cq', '23', '-b:v', '0', ...rate, '-pix_fmt', 'yuv420p']
    case 'h264_qsv':   return ['-c:v', enc, '-preset', 'faster', '-global_quality', '23', ...rate, '-pix_fmt', 'nv12']
    case 'h264_amf':   return ['-c:v', enc, '-quality', 'balanced', '-rc', 'vbr_peak', '-b:v', `${Math.round(maxKbps * 0.75)}k`, ...rate, '-pix_fmt', 'yuv420p']
    default:           return ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', ...rate, '-pix_fmt', 'yuv420p', '-profile:v', 'high']
  }
}

function transcode(
  ff: FfmpegInfo, input: string, output: string, info: VideoInfo, limits: VideoLimits, enc: string,
  onProgress: (p: number) => void,
): Promise<void> {
  const height  = Math.min(info.height || limits.maxHeight, limits.maxHeight)
  const filters = [`scale=-2:${height % 2 === 0 ? height : height - 1}`]
  if (info.fps > limits.maxFps + 0.5) filters.push(`fps=${limits.maxFps}`)
  const args = [
    '-y', '-hide_banner', '-nostats', '-progress', 'pipe:1',
    '-i', input,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', filters.join(','),
    ...encoderArgs(enc, Math.min(limits.maxBitrateKbps, height <= 720 ? 5000 : height <= 1080 ? 10000 : limits.maxBitrateKbps)),
    '-c:a', 'aac', '-b:a', '160k', '-ac', '2',
    '-movflags', '+faststart',
    '-f', 'mp4', output,
  ]
  return new Promise((resolve, reject) => {
    const p = spawn(ff.path, args, { windowsHide: true })
    let tail = ''
    p.stdout.on('data', (d: Buffer) => {
      const m = d.toString().match(/out_time_us=(\d+)/g)
      const last = m?.[m.length - 1]
      if (last && info.durationSec > 0) onProgress(Math.min(0.99, parseInt(last.split('=')[1]!, 10) / 1e6 / info.durationSec))
    })
    p.stderr.on('data', (d: Buffer) => { tail = (tail + d.toString()).slice(-2000) })
    p.on('error', reject)
    p.on('close', code => (code === 0 ? resolve() : reject(new Error(tail.split('\n').filter(Boolean).pop() ?? `ffmpeg exit ${code}`))))
  })
}

/**
 * Queue a conversion. Jobs run one at a time (gentle on low-end PCs); a failing hardware
 * encoder falls back to the CPU encoder. On success the source is removed unless keepOriginal.
 */
export function enqueueConversion(
  ff: FfmpegInfo, dir: string, file: string, target: string, info: VideoInfo, limits: VideoLimits, reasons: string[],
): ConvertJob {
  const job: ConvertJob = { file, target, state: 'queued', progress: 0, reasons }
  jobs.set(file, job)

  g.__ecQueue = (g.__ecQueue ?? Promise.resolve()).then(async () => {
    const input = join(dir, file)
    const part  = join(dir, `${target}.part`)
    job.state = 'converting'
    try {
      let enc = await pickEncoder(ff)
      job.encoder = enc
      try {
        await transcode(ff, input, part, info, limits, enc, p => { job.progress = p })
      } catch (err) {
        if (enc === 'libx264') throw err
        enc = 'libx264'                       // hardware encoder failed on this file → CPU
        job.encoder = enc
        job.progress = 0
        await transcode(ff, input, part, info, limits, enc, p => { job.progress = p })
      }
      renameSync(part, join(dir, target))
      if (!limits.keepOriginal && existsSync(input)) unlinkSync(input)
      job.state = 'done'
      job.progress = 1
    } catch (err) {
      if (existsSync(part)) unlinkSync(part)
      job.state = 'error'
      job.error = err instanceof Error ? err.message : String(err)
    }
  })
  return job
}

export function listJobs(): ConvertJob[] {
  return Array.from(jobs.values())
}

export function jobFor(file: string): ConvertJob | undefined {
  return jobs.get(file)
}
