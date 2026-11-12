import { NextRequest, NextResponse } from 'next/server'
import { getPresenterDb } from '@/lib/db.server'
import Database from 'better-sqlite3'
import { inflateSync } from 'zlib'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Standard Bible book fallback (Indonesian names, by 1-based number)
const BIBLE_BOOKS: Array<{ number: number; code: string; name: string; name_abbr: string; testament: 'OT' | 'NT' }> = [
  { number: 1,  code: 'GEN', name: 'Kejadian',          name_abbr: 'Kej',  testament: 'OT' },
  { number: 2,  code: 'EXO', name: 'Keluaran',          name_abbr: 'Kel',  testament: 'OT' },
  { number: 3,  code: 'LEV', name: 'Imamat',            name_abbr: 'Im',   testament: 'OT' },
  { number: 4,  code: 'NUM', name: 'Bilangan',          name_abbr: 'Bil',  testament: 'OT' },
  { number: 5,  code: 'DEU', name: 'Ulangan',           name_abbr: 'Ul',   testament: 'OT' },
  { number: 6,  code: 'JOS', name: 'Yosua',             name_abbr: 'Yos',  testament: 'OT' },
  { number: 7,  code: 'JDG', name: 'Hakim-hakim',       name_abbr: 'Hak',  testament: 'OT' },
  { number: 8,  code: 'RUT', name: 'Rut',               name_abbr: 'Rut',  testament: 'OT' },
  { number: 9,  code: '1SA', name: '1 Samuel',          name_abbr: '1Sam', testament: 'OT' },
  { number: 10, code: '2SA', name: '2 Samuel',          name_abbr: '2Sam', testament: 'OT' },
  { number: 11, code: '1KI', name: '1 Raja-raja',       name_abbr: '1Raj', testament: 'OT' },
  { number: 12, code: '2KI', name: '2 Raja-raja',       name_abbr: '2Raj', testament: 'OT' },
  { number: 13, code: '1CH', name: '1 Tawarikh',        name_abbr: '1Taw', testament: 'OT' },
  { number: 14, code: '2CH', name: '2 Tawarikh',        name_abbr: '2Taw', testament: 'OT' },
  { number: 15, code: 'EZR', name: 'Ezra',              name_abbr: 'Ezr',  testament: 'OT' },
  { number: 16, code: 'NEH', name: 'Nehemia',           name_abbr: 'Neh',  testament: 'OT' },
  { number: 17, code: 'EST', name: 'Ester',             name_abbr: 'Est',  testament: 'OT' },
  { number: 18, code: 'JOB', name: 'Ayub',              name_abbr: 'Ayb',  testament: 'OT' },
  { number: 19, code: 'PSA', name: 'Mazmur',            name_abbr: 'Mzm',  testament: 'OT' },
  { number: 20, code: 'PRO', name: 'Amsal',             name_abbr: 'Ams',  testament: 'OT' },
  { number: 21, code: 'ECC', name: 'Pengkhotbah',       name_abbr: 'Pkh',  testament: 'OT' },
  { number: 22, code: 'SNG', name: 'Kidung Agung',      name_abbr: 'Kid',  testament: 'OT' },
  { number: 23, code: 'ISA', name: 'Yesaya',            name_abbr: 'Yes',  testament: 'OT' },
  { number: 24, code: 'JER', name: 'Yeremia',           name_abbr: 'Yer',  testament: 'OT' },
  { number: 25, code: 'LAM', name: 'Ratapan',           name_abbr: 'Rat',  testament: 'OT' },
  { number: 26, code: 'EZK', name: 'Yehezkiel',         name_abbr: 'Yeh',  testament: 'OT' },
  { number: 27, code: 'DAN', name: 'Daniel',            name_abbr: 'Dan',  testament: 'OT' },
  { number: 28, code: 'HOS', name: 'Hosea',             name_abbr: 'Hos',  testament: 'OT' },
  { number: 29, code: 'JOL', name: 'Yoel',              name_abbr: 'Yoel', testament: 'OT' },
  { number: 30, code: 'AMO', name: 'Amos',              name_abbr: 'Am',   testament: 'OT' },
  { number: 31, code: 'OBA', name: 'Obaja',             name_abbr: 'Ob',   testament: 'OT' },
  { number: 32, code: 'JON', name: 'Yunus',             name_abbr: 'Yun',  testament: 'OT' },
  { number: 33, code: 'MIC', name: 'Mikha',             name_abbr: 'Mi',   testament: 'OT' },
  { number: 34, code: 'NAM', name: 'Nahum',             name_abbr: 'Nah',  testament: 'OT' },
  { number: 35, code: 'HAB', name: 'Habakuk',           name_abbr: 'Hab',  testament: 'OT' },
  { number: 36, code: 'ZEP', name: 'Zefanya',           name_abbr: 'Zef',  testament: 'OT' },
  { number: 37, code: 'HAG', name: 'Hagai',             name_abbr: 'Hag',  testament: 'OT' },
  { number: 38, code: 'ZEC', name: 'Zakharia',          name_abbr: 'Za',   testament: 'OT' },
  { number: 39, code: 'MAL', name: 'Maleakhi',          name_abbr: 'Mal',  testament: 'OT' },
  { number: 40, code: 'MAT', name: 'Matius',            name_abbr: 'Mat',  testament: 'NT' },
  { number: 41, code: 'MRK', name: 'Markus',            name_abbr: 'Mrk',  testament: 'NT' },
  { number: 42, code: 'LUK', name: 'Lukas',             name_abbr: 'Luk',  testament: 'NT' },
  { number: 43, code: 'JHN', name: 'Yohanes',           name_abbr: 'Yoh',  testament: 'NT' },
  { number: 44, code: 'ACT', name: 'Kisah Para Rasul',  name_abbr: 'Kis',  testament: 'NT' },
  { number: 45, code: 'ROM', name: 'Roma',              name_abbr: 'Rom',  testament: 'NT' },
  { number: 46, code: '1CO', name: '1 Korintus',        name_abbr: '1Kor', testament: 'NT' },
  { number: 47, code: '2CO', name: '2 Korintus',        name_abbr: '2Kor', testament: 'NT' },
  { number: 48, code: 'GAL', name: 'Galatia',           name_abbr: 'Gal',  testament: 'NT' },
  { number: 49, code: 'EPH', name: 'Efesus',            name_abbr: 'Ef',   testament: 'NT' },
  { number: 50, code: 'PHP', name: 'Filipi',            name_abbr: 'Fil',  testament: 'NT' },
  { number: 51, code: 'COL', name: 'Kolose',            name_abbr: 'Kol',  testament: 'NT' },
  { number: 52, code: '1TH', name: '1 Tesalonika',      name_abbr: '1Tes', testament: 'NT' },
  { number: 53, code: '2TH', name: '2 Tesalonika',      name_abbr: '2Tes', testament: 'NT' },
  { number: 54, code: '1TI', name: '1 Timotius',        name_abbr: '1Tim', testament: 'NT' },
  { number: 55, code: '2TI', name: '2 Timotius',        name_abbr: '2Tim', testament: 'NT' },
  { number: 56, code: 'TIT', name: 'Titus',             name_abbr: 'Tit',  testament: 'NT' },
  { number: 57, code: 'PHM', name: 'Filemon',           name_abbr: 'Flm',  testament: 'NT' },
  { number: 58, code: 'HEB', name: 'Ibrani',            name_abbr: 'Ibr',  testament: 'NT' },
  { number: 59, code: 'JAS', name: 'Yakobus',           name_abbr: 'Yak',  testament: 'NT' },
  { number: 60, code: '1PE', name: '1 Petrus',          name_abbr: '1Pet', testament: 'NT' },
  { number: 61, code: '2PE', name: '2 Petrus',          name_abbr: '2Pet', testament: 'NT' },
  { number: 62, code: '1JN', name: '1 Yohanes',         name_abbr: '1Yoh', testament: 'NT' },
  { number: 63, code: '2JN', name: '2 Yohanes',         name_abbr: '2Yoh', testament: 'NT' },
  { number: 64, code: '3JN', name: '3 Yohanes',         name_abbr: '3Yoh', testament: 'NT' },
  { number: 65, code: 'JUD', name: 'Yudas',             name_abbr: 'Yud',  testament: 'NT' },
  { number: 66, code: 'REV', name: 'Wahyu',             name_abbr: 'Why',  testament: 'NT' },
]

// ── EasyWorship Bible Text parser ──────────────────────────────────────────
// Format: proprietary binary, 66 books × 224-byte directory entries starting
// at offset 88, each with abbreviation at entry+0 and compressed text
// file-offset at entry+0xD0 (uint32 LE). Text is zlib-compressed, decompresses
// to plain "chapter:verse Text\r\n\r\n" lines per verse.

const EWB_MAGIC       = 'EasyWorship Bible Text'
const EWB_DIR_OFFSET  = 88
const EWB_ENTRY_SIZE  = 224
const EWB_TEXT_OFS    = 0xD0  // offset within entry to uint32 file-offset

function parseEasyWorshipBible(buf: Buffer) {
  if (!buf.toString('ascii', 0, 22).startsWith(EWB_MAGIC)) {
    throw new Error('Bukan file EasyWorship Bible Text yang valid.')
  }

  // Collect text offsets for all 66 books
  const textOffsets: number[] = []
  for (let i = 0; i < 66; i++) {
    const entryStart = EWB_DIR_OFFSET + i * EWB_ENTRY_SIZE
    textOffsets.push(buf.readUInt32LE(entryStart + EWB_TEXT_OFS))
  }

  // Parse language & build version code from filename (caller supplies)
  const language = buf.toString('latin1', 32, 42).replace(/\0/g, '').trim()

  const books = []
  let totalVerses = 0

  for (let i = 0; i < 66; i++) {
    const entryStart = EWB_DIR_OFFSET + i * EWB_ENTRY_SIZE
    const rawAbbr = buf.toString('latin1', entryStart, entryStart + 16).split('\0')[0] ?? ''
    const abbr = rawAbbr.replace(/\.$/, '').trim()   // strip trailing dot

    const startOfs = textOffsets[i]!
    const endOfs   = i < 65 ? textOffsets[i + 1]! : buf.length

    const compressed = buf.slice(startOfs, endOfs)
    const text = inflateSync(compressed).toString('utf8')

    // Parse "chapter:verse text\r\n\r\n" blocks
    const chapMap = new Map<number, { verse: number; text: string }[]>()
    for (const block of text.split('\r\n\r\n')) {
      const trimmed = block.trim()
      if (!trimmed) continue
      const spaceIdx = trimmed.indexOf(' ')
      if (spaceIdx < 0) continue
      const cv = trimmed.slice(0, spaceIdx)
      const verseText = trimmed.slice(spaceIdx + 1).trim()
      const colonIdx = cv.indexOf(':')
      if (colonIdx < 0) continue
      const chapterNum = parseInt(cv.slice(0, colonIdx), 10)
      const verseNum   = parseInt(cv.slice(colonIdx + 1), 10)
      if (!chapterNum || !verseNum || !verseText) continue
      if (!chapMap.has(chapterNum)) chapMap.set(chapterNum, [])
      chapMap.get(chapterNum)!.push({ verse: verseNum, text: verseText })
      totalVerses++
    }

    const bookNum  = i + 1
    const fallback = BIBLE_BOOKS[i]!
    books.push({
      number:     bookNum,
      code:       fallback.code,
      name:       fallback.name,
      name_abbr:  abbr || fallback.name_abbr,
      testament:  fallback.testament,
      chapters:   Array.from(chapMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([num, verses]) => ({
          number: num,
          verses: verses.sort((a, b) => a.verse - b.verse).map(v => ({ verse: v.verse, text: v.text })),
        })),
    })
  }

  return { books, language, totalVerses }
}

// ── SQLite-based EWB fallback parser (older/other formats) ─────────────────
function col(cols: string[], ...candidates: string[]): string | null {
  for (const c of candidates) {
    const found = cols.find(x => x.toLowerCase() === c.toLowerCase())
    if (found) return found
  }
  return null
}

function parseEwbSqlite(tmpPath: string, fileName: string) {
  const ewbDb  = new Database(tmpPath, { readonly: true, fileMustExist: true })
  const allTables = (ewbDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map(r => r.name)

  const verseCandidates = ['Bible', 'BibleData', 'Verse', 'verses', 'BIBLE']
  let verseTable = allTables.find(t => verseCandidates.some(c => c.toLowerCase() === t.toLowerCase()))
  if (!verseTable) {
    for (const t of allTables) {
      const cols = (ewbDb.prepare(`PRAGMA table_info("${t}")`).all() as { name: string }[]).map(r => r.name)
      if (cols.length >= 4) { verseTable = t; break }
    }
  }
  if (!verseTable) { ewbDb.close(); throw new Error('Tidak ditemukan tabel verse di file EWB (SQLite).') }

  const vCols    = (ewbDb.prepare(`PRAGMA table_info("${verseTable}")`).all() as { name: string }[]).map(r => r.name)
  const bookCol  = col(vCols, 'b', 'book', 'booknumber', 'book_id', 'BookNumber', 'Book') ?? vCols[0]!
  const chapCol  = col(vCols, 'c', 'chapter', 'chapternumber', 'Chapter', 'ChapterNumber') ?? vCols[1]!
  const verseCol = col(vCols, 'v', 'verse', 'versenumber', 'Verse', 'VerseNumber') ?? vCols[2]!
  const textCol  = col(vCols, 't', 'text', 'scripture', 'versetext', 'VerseText', 'Scripture', 'Text') ?? vCols[3]!

  const rawVerses = ewbDb.prepare(
    `SELECT "${bookCol}" as b,"${chapCol}" as c,"${verseCol}" as v,"${textCol}" as t FROM "${verseTable}" ORDER BY b,c,v`
  ).all() as { b: number; c: number; v: number; t: string }[]
  ewbDb.close()

  // Group by book → chapter
  const booksMap = new Map<number, Map<number, { verse: number; text: string }[]>>()
  for (const row of rawVerses) {
    const bn = Number(row.b), cn = Number(row.c), vn = Number(row.v), txt = String(row.t ?? '')
    if (!booksMap.has(bn)) booksMap.set(bn, new Map())
    const chaps = booksMap.get(bn)!
    if (!chaps.has(cn)) chaps.set(cn, [])
    chaps.get(cn)!.push({ verse: vn, text: txt })
  }

  const bookNums = Array.from(booksMap.keys()).sort((a, b) => a - b)
  let totalVerses = 0
  const books = bookNums.map(bn => {
    const fb = BIBLE_BOOKS.find(b => b.number === bn)!
    const chapsMap = booksMap.get(bn)!
    const chapters = Array.from(chapsMap.entries()).sort(([a], [b]) => a - b).map(([num, verses]) => {
      totalVerses += verses.length
      return { number: num, verses: verses.sort((a, b) => a.verse - b.verse).map(v => ({ verse: v.verse, text: v.text })) }
    })
    return {
      number: bn, code: fb?.code ?? `B${bn}`, name: fb?.name ?? `Kitab ${bn}`,
      name_abbr: fb?.name_abbr ?? `K${bn}`, testament: fb?.testament ?? (bn <= 39 ? 'OT' : 'NT') as 'OT' | 'NT', chapters,
    }
  })

  return { books, language: 'id', totalVerses }
}

// ── API handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let tmpPath: string | null = null
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan dalam request' }, { status: 400 })

    const buf    = Buffer.from(await file.arrayBuffer())
    const magic  = buf.toString('ascii', 0, 22)
    const isSqlite = buf.slice(0, 16).toString('ascii').startsWith('SQLite format 3')

    let parsed: { books: ReturnType<typeof parseEasyWorshipBible>['books']; language: string; totalVerses: number }

    if (magic.startsWith(EWB_MAGIC)) {
      parsed = parseEasyWorshipBible(buf)
    } else if (isSqlite) {
      tmpPath = join(tmpdir(), `ewb_${Date.now()}.db`)
      writeFileSync(tmpPath, buf)
      parsed = parseEwbSqlite(tmpPath, file.name)
    } else {
      return NextResponse.json({
        error: `Format file tidak dikenali. Magic bytes: "${buf.toString('ascii', 0, Math.min(22, buf.length))}". File EWB yang didukung: EasyWorship Bible Text (binary) atau SQLite.`,
      }, { status: 400 })
    }

    const { books, language, totalVerses } = parsed

    if (!books.length) throw new Error('Tidak ada data kitab yang ditemukan dalam file EWB.')

    // Build version code from filename
    const baseName   = file.name.replace(/\.ewb$/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10) || 'EWB'
    const versionCode = baseName
    const displayName = file.name.replace(/\.ewb$/i, '')

    // Persist to presenter DB (same logic as /api/bible/import)
    const db = getPresenterDb() as unknown as Database.Database

    let versionRow = db.prepare('SELECT id FROM bible_versions WHERE code = ?').get(versionCode) as { id: number } | undefined
    if (!versionRow) {
      const r = db.prepare('INSERT INTO bible_versions(code, name, language) VALUES (?,?,?)').run(versionCode, displayName, language || 'id')
      versionRow = { id: r.lastInsertRowid as number }
    }
    const versionId = versionRow.id

    const importAll = db.transaction(() => {
      for (const book of books) {
        let bookRow = db.prepare('SELECT id FROM books WHERE version_id = ? AND number = ?').get(versionId, book.number) as { id: number } | undefined
        if (!bookRow) {
          const r = db.prepare(`INSERT INTO books(version_id,number,code,name,name_abbr,testament,total_chapters) VALUES (?,?,?,?,?,?,?)`
          ).run(versionId, book.number, book.code, book.name, book.name_abbr, book.testament, book.chapters.length)
          bookRow = { id: r.lastInsertRowid as number }
        } else {
          db.prepare('UPDATE books SET total_chapters=? WHERE id=?').run(book.chapters.length, bookRow.id)
        }
        for (const chapter of book.chapters) {
          let chRow = db.prepare('SELECT id FROM chapters WHERE book_id=? AND number=?').get(bookRow.id, chapter.number) as { id: number } | undefined
          if (!chRow) {
            const r = db.prepare('INSERT INTO chapters(book_id,number,total_verses) VALUES (?,?,?)').run(bookRow.id, chapter.number, chapter.verses.length)
            chRow = { id: r.lastInsertRowid as number }
          } else {
            db.prepare('UPDATE chapters SET total_verses=? WHERE id=?').run(chapter.verses.length, chRow.id)
          }
          for (const verse of chapter.verses) {
            db.prepare(`INSERT INTO ayat(chapter_id,verse_number,text) VALUES (?,?,?) ON CONFLICT(chapter_id,verse_number) DO UPDATE SET text=excluded.text`
            ).run(chRow.id, verse.verse, verse.text)
          }
        }
      }
    })
    importAll()

    return NextResponse.json({ success: true, version: versionCode, totalBooks: books.length, totalVerses })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 503 })
  } finally {
    if (tmpPath && existsSync(tmpPath)) {
      try { unlinkSync(tmpPath) } catch { /* ignore */ }
    }
  }
}
