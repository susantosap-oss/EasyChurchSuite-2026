import { NextResponse } from 'next/server'
import { resolveFfmpeg, listJobs } from '@/lib/ffmpeg.server'

// Reads live data — never prerender at build time
export const dynamic = 'force-dynamic'

/** FFmpeg availability + video conversion queue */
export async function GET() {
  const ffmpeg = await resolveFfmpeg()
  const g = globalThis as { __ecEncoder?: string }
  return NextResponse.json({ ffmpeg, encoder: g.__ecEncoder ?? null, jobs: listJobs() })
}
