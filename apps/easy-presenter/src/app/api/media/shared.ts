import { join, extname } from 'path'
import { getDataDir } from '@/lib/db.server'
import { MEDIA_MIME } from '@/lib/fileServe'
import { CONVERT_ONLY_EXT } from '@/lib/ffmpeg.server'

export type MediaKind = 'image' | 'video' | 'pdf' | 'ppt'

/** Media library files (left panel → Media), stored in data/media */
export function mediaDir(): string {
  return join(getDataDir(), 'media')
}

export const MEDIA_LIB_MIME: Record<string, string> = {
  ...MEDIA_MIME,
  '.pdf': 'application/pdf',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

export function mediaKind(name: string): MediaKind | null {
  const ext = extname(name).toLowerCase()
  if (ext === '.pdf') return 'pdf'
  if (ext === '.ppt' || ext === '.pptx') return 'ppt'
  if (CONVERT_ONLY_EXT.has(ext)) return 'video'
  const mime = MEDIA_MIME[ext]
  if (!mime) return null
  return mime.startsWith('video/') ? 'video' : 'image'
}

/** Video the browser can play as uploaded (convert-only containers need FFmpeg first) */
export function isPlayable(name: string): boolean {
  return !CONVERT_ONLY_EXT.has(extname(name).toLowerCase())
}

// No trailing slash: with trailingSlash=true Next redirects paths ending in a file extension
export function mediaFileUrl(file: string): string {
  return `/api/media/file/${encodeURIComponent(file)}`
}

/** Display name: stored as "<timestamp>_<original>" */
export function displayName(file: string): string {
  return file.replace(/^\d+_/, '')
}
