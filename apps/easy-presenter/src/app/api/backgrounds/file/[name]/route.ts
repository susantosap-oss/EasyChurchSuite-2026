import { NextRequest } from 'next/server'
import { join, basename } from 'path'
import { serveFile } from '@/lib/fileServe'
import { backgroundsDir } from '../../shared'

/** Serve an uploaded background */
export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  return serveFile(req, join(backgroundsDir(), basename(decodeURIComponent(params.name))))
}
