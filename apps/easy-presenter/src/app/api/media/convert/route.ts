import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'fs'
import { join, basename } from 'path'
import { mediaDir, mediaKind } from '../shared'
import { enqueueOfficeConversion } from '@/lib/office.server'
import { jobFor } from '@/lib/ffmpeg.server'

/** Convert a library presentation (PPTX / PPT) to PDF again — e.g. after installing / activating an office suite */
export async function POST(req: NextRequest) {
  const { file } = await req.json().catch(() => ({})) as { file?: string }
  const name = basename(String(file ?? ''))
  if (!name || mediaKind(name) !== 'ppt' || !existsSync(join(mediaDir(), name))) {
    return NextResponse.json({ error: 'File presentasi tidak ditemukan' }, { status: 400 })
  }
  const running = jobFor(name)
  if (running && (running.state === 'queued' || running.state === 'converting')) return NextResponse.json({ job: running })
  return NextResponse.json({ job: enqueueOfficeConversion(mediaDir(), name) })
}
