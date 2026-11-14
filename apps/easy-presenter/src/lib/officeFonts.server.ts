// Fonts embedded in a PPTX (Canva / PowerPoint "embed fonts") for office suites that ignore them
// (LibreOffice, WPS). They are unpacked, renamed to the exact typeface the slides ask for
// (e.g. "Montserrat Bold"), and registered with Windows only for the duration of a conversion.
import { execFile } from 'child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import JSZip from 'jszip'

const STYLE: Record<string, string> = { regular: 'Regular', bold: 'Bold', italic: 'Italic', boldItalic: 'Bold Italic' }

/**
 * New 'name' table: the original records with family / style / full / PostScript names replaced and the
 * typographic family (16/17) dropped, so the font is known by `family`. Windows rejects a font whose
 * name table loses its other records, so they are kept.
 */
function nameTable(orig: Buffer, family: string, style: string): Buffer {
  const full = style === 'Regular' ? family : `${family} ${style}`
  const replace: Record<number, string> = { 1: family, 2: style, 4: full, 6: full.replace(/[^A-Za-z0-9-]/g, '').slice(0, 63) }
  const count = orig.readUInt16BE(2), storage = orig.readUInt16BE(4)
  const recs: { plat: number; enc: number; lang: number; id: number; data: Buffer }[] = []
  for (let i = 0; i < count; i++) {
    const p = 6 + 12 * i
    const plat = orig.readUInt16BE(p), enc = orig.readUInt16BE(p + 2), lang = orig.readUInt16BE(p + 4), id = orig.readUInt16BE(p + 6)
    if (id === 16 || id === 17) continue
    const off = storage + orig.readUInt16BE(p + 10)
    let data = orig.subarray(off, off + orig.readUInt16BE(p + 8))
    const text = replace[id]
    if (text !== undefined) data = plat === 1 ? Buffer.from(text, 'latin1') : Buffer.from(text, 'utf16le').swap16()
    recs.push({ plat, enc, lang, id, data })
  }
  recs.sort((a, b) => a.plat - b.plat || a.enc - b.enc || a.lang - b.lang || a.id - b.id)
  const header = Buffer.alloc(6 + 12 * recs.length)
  header.writeUInt16BE(recs.length, 2)
  header.writeUInt16BE(header.length, 4)
  let off = 0
  recs.forEach((r, i) => {
    const p = 6 + 12 * i
    header.writeUInt16BE(r.plat, p); header.writeUInt16BE(r.enc, p + 2); header.writeUInt16BE(r.lang, p + 4)
    header.writeUInt16BE(r.id, p + 6); header.writeUInt16BE(r.data.length, p + 8); header.writeUInt16BE(off, p + 10)
    off += r.data.length
  })
  return Buffer.concat([header, ...recs.map(r => r.data)])
}

const pad4 = (n: number) => (4 - (n % 4)) % 4

function checksum(buf: Buffer): number {
  const padded = Buffer.concat([buf, Buffer.alloc(pad4(buf.length))])
  let sum = 0
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0
  return sum
}

/** Rename a TrueType / OpenType font: the new name table is appended and the directory entry repointed */
function renameFont(font: Buffer, family: string, style: string): Buffer {
  let out = Buffer.from(font)
  const tables = out.readUInt16BE(4)
  for (let i = 0; i < tables; i++) {
    const rec = 12 + 16 * i
    if (out.toString('latin1', rec, rec + 4) !== 'name') continue
    const start = out.readUInt32BE(rec + 8)
    const table = nameTable(out.subarray(start, start + out.readUInt32BE(rec + 12)), family, style)
    const offset = out.length + pad4(out.length)
    out = Buffer.concat([out, Buffer.alloc(pad4(out.length)), table, Buffer.alloc(pad4(table.length))])
    out.writeUInt32BE(checksum(table), rec + 4)
    out.writeUInt32BE(offset, rec + 8)
    out.writeUInt32BE(table.length, rec + 12)
  }
  return out
}

/** Unpack the embedded fonts of a PPTX into `dir`; returns the written .ttf paths (none for other files) */
export async function extractEmbeddedFonts(pptxPath: string, dir: string): Promise<string[]> {
  let zip: JSZip
  try { zip = await JSZip.loadAsync(readFileSync(pptxPath)) } catch { return [] }   // .ppt (binary) or broken file
  const pres = await zip.file('ppt/presentation.xml')?.async('string')
  const rels = await zip.file('ppt/_rels/presentation.xml.rels')?.async('string')
  if (!pres || !rels) return []
  const target: Record<string, string> = {}
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0]), t = /Target="([^"]+)"/.exec(m[0])
    if (id && t) target[id[1]!] = t[1]!
  }
  mkdirSync(dir, { recursive: true })
  const files: string[] = []
  for (const m of pres.matchAll(/<p:embeddedFont>([\s\S]*?)<\/p:embeddedFont>/g)) {
    const family = /typeface="([^"]+)"/.exec(m[1]!)?.[1]
    if (!family) continue
    for (const v of m[1]!.matchAll(/<p:(regular|bold|italic|boldItalic) r:id="([^"]+)"/g)) {
      const part = target[v[2]!]
      const raw  = part && await zip.file('ppt/' + part.replace(/^\/?ppt\//, ''))?.async('nodebuffer')
      if (!raw || raw.length < 40) continue
      // Embedded OpenType: the TrueType data sits at the end; MTX-compressed fonts are skipped
      const isEot = raw.readUInt16LE(34) === 0x504c
      if (isEot && (raw.readUInt32LE(12) & 0x4)) continue
      const ttf = isEot ? raw.subarray(raw.readUInt32LE(0) - raw.readUInt32LE(4), raw.readUInt32LE(0)) : raw
      const sig = ttf.readUInt32BE(0)
      if (sig !== 0x00010000 && sig !== 0x4f54544f) continue   // not TrueType / OpenType
      try {
        const file = join(dir, `font-${files.length}.ttf`)
        writeFileSync(file, renameFont(ttf, family, STYLE[v[1]!] ?? 'Regular'))
        files.push(file)
      } catch { /* malformed font → the suite falls back to a substitute */ }
    }
  }
  return files
}

/** Add (or remove) fonts for every program in this Windows session — not installed, gone after removal */
const FONT_SCRIPT = `
Add-Type -Namespace EcFonts -Name Gdi -MemberDefinition @'
[DllImport("gdi32.dll", CharSet = CharSet.Unicode)] public static extern int AddFontResourceEx(string name, uint fl, IntPtr res);
[DllImport("gdi32.dll", CharSet = CharSet.Unicode)] public static extern bool RemoveFontResourceEx(string name, uint fl, IntPtr res);
'@
$n = 0
foreach ($f in ($env:EC_FONTS -split [char]10)) {
  if (-not $f) { continue }
  if ($env:EC_ACTION -eq 'add') { $n += [EcFonts.Gdi]::AddFontResourceEx($f, 0, [IntPtr]::Zero) }
  elseif ([EcFonts.Gdi]::RemoveFontResourceEx($f, 0, [IntPtr]::Zero)) { $n++ }
}
$n
`

function fontAction(action: 'add' | 'remove', files: string[]): Promise<number> {
  if (process.platform !== 'win32' || !files.length) return Promise.resolve(0)
  return new Promise(resolve => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', FONT_SCRIPT], {
      timeout: 30_000, windowsHide: true,
      env: { ...process.env, EC_ACTION: action, EC_FONTS: files.join('\n') },
    }, (_err, stdout) => resolve(parseInt(String(stdout).trim(), 10) || 0))
  })
}

/** Register the files, run `task`, always unregister afterwards */
export async function withTemporaryFonts<T>(files: string[], task: () => Promise<T>): Promise<T> {
  await fontAction('add', files)
  try { return await task() } finally { await fontAction('remove', files) }
}
