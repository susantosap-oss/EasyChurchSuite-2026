import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

let cached: string | null = null

/** pdf.js web worker, served from node_modules so it always matches the installed pdfjs-dist */
export async function GET() {
  cached ??= readFileSync(
    // require.resolve is rewritten by webpack in route bundles — resolve from the app folder instead
    join(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.min.js'), 'utf8')
  return new NextResponse(cached, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
  })
}
