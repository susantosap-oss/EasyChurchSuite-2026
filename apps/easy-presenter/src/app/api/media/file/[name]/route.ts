import { NextRequest } from 'next/server'
import { join, basename } from 'path'
import { serveFile } from '@/lib/fileServe'
import { mediaDir, MEDIA_LIB_MIME } from '../../shared'

/** Serve a media library file (Range support for video) */
export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  return serveFile(req, join(mediaDir(), basename(decodeURIComponent(params.name))), MEDIA_LIB_MIME)
}
