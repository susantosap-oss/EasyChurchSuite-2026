import { NextRequest, NextResponse } from 'next/server'
import { existsSync, unlinkSync } from 'fs'
import { join, basename } from 'path'
import { mediaDir, mediaKind } from '../shared'

/** Permanently delete one media library file */
export async function DELETE(_req: NextRequest, { params }: { params: { name: string } }) {
  const file = basename(decodeURIComponent(params.name))
  const path = join(mediaDir(), file)
  if (!mediaKind(file) || !existsSync(path)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  unlinkSync(path)
  return NextResponse.json({ success: true })
}
