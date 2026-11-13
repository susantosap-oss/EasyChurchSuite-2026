import { join, extname } from 'path'
import { getDataDir } from '@/lib/db.server'
import { MEDIA_MIME } from '@/lib/fileServe'

export const BG_MIME = MEDIA_MIME

export function backgroundsDir(): string {
  return join(getDataDir(), 'backgrounds')
}

export function bgKind(name: string): 'image' | 'video' | null {
  const mime = BG_MIME[extname(name).toLowerCase()]
  if (!mime) return null
  return mime.startsWith('video/') ? 'video' : 'image'
}

export function bgFileUrl(name: string): string {
  // No trailing slash: with trailingSlash=true Next redirects paths ending in a file extension
  return `/api/backgrounds/file/${encodeURIComponent(name)}`
}
