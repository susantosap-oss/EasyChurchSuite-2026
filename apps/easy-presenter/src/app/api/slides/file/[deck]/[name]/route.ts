import { NextRequest } from 'next/server'
import { join, basename } from 'path'
import { serveFile } from '@/lib/fileServe'
import { slidesDir } from '../../../shared'

/** Serve one rendered presentation page */
export async function GET(req: NextRequest, { params }: { params: { deck: string; name: string } }) {
  return serveFile(req, join(slidesDir(), basename(params.deck), basename(decodeURIComponent(params.name))))
}
