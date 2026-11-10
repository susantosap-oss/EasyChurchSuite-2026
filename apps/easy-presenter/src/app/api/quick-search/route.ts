import { NextResponse } from 'next/server'
import { CANONICAL_BOOKS } from '@easychurch/scripture'
import { getChapterVerses, getVerse, getBookInfo } from '@easychurch/bible-queries'
import { getPresenterDb } from '@/lib/db.server'

// Build book name/abbr → number lookup (Indonesian + English names)
const BOOK_LOOKUP: Record<string, number> = {}
for (const b of CANONICAL_BOOKS) {
  const add = (key: string) => { BOOK_LOOKUP[key] = b.number }
  add(b.nameAbbr.toLowerCase())
  add(b.name.toLowerCase())
  add(b.nameAbbr.toLowerCase().replace(/\s+/g, ''))
  add(b.name.toLowerCase().replace(/\s+/g, ''))
}

// English abbreviations (KJV) — allows "John 3:16", "Gen 1:1", "Rom 8:28" etc.
const EN_ABBR: Array<[number, string, ...string[]]> = [
  [1,'gen'],[2,'ex','exo'],[3,'lev'],[4,'num'],[5,'deut','dt'],[6,'josh','jos'],
  [7,'judg','jdg'],[8,'ruth','rth'],[9,'1sam','1sa'],[10,'2sam','2sa'],
  [11,'1kgs','1ki','1kings'],[12,'2kgs','2ki','2kings'],
  [13,'1chr','1ch','1chron'],[14,'2chr','2ch','2chron'],
  [15,'ezra','ezr'],[16,'neh'],[17,'est','esth'],[18,'job'],
  [19,'ps','psa','psalm','psalms'],[20,'prov','prv'],
  [21,'eccl','ecc','eccles'],[22,'song','sng','ss','sos'],
  [23,'isa'],[24,'jer'],[25,'lam'],[26,'ezek','eze'],
  [27,'dan'],[28,'hos'],[29,'joel'],[30,'amos'],
  [31,'obad','ob'],[32,'jon','jonah'],[33,'mic'],[34,'nah'],
  [35,'hab'],[36,'zeph','zep'],[37,'hag'],[38,'zech','zec'],
  [39,'mal'],[40,'matt','mt'],[41,'mark','mk','mar'],
  [42,'luke','lk'],[43,'john','jn'],[44,'acts','ac'],
  [45,'rom'],[46,'1cor','1co'],[47,'2cor','2co'],
  [48,'gal'],[49,'eph'],[50,'phil','php'],
  [51,'col'],[52,'1thess','1th','1ths'],[53,'2thess','2th','2ths'],
  [54,'1tim','1ti'],[55,'2tim','2ti'],[56,'titus','tit'],
  [57,'phlm','phm','philem'],[58,'heb'],[59,'jas','jam'],
  [60,'1pet','1pe'],[61,'2pet','2pe'],
  [62,'1john','1jn','1jo'],[63,'2john','2jn','2jo'],
  [64,'3john','3jn','3jo'],[65,'jude','jud'],[66,'rev','rv','apoc'],
]
for (const [num, ...abbrs] of EN_ABBR) {
  for (const a of abbrs) BOOK_LOOKUP[a] = num
}

/** Parse "Yoh 3:16", "1Kor 13:4", "Mzm 23", "Yohanes 3:16" etc. */
function parseBibleRef(raw: string) {
  const q = raw.trim()
  const colonIdx = q.lastIndexOf(':')
  let bookChapter: string
  let verse: number | undefined

  if (colonIdx > 0) {
    const v = parseInt(q.slice(colonIdx + 1).trim(), 10)
    if (!isNaN(v)) { verse = v; bookChapter = q.slice(0, colonIdx).trim() }
    else bookChapter = q
  } else {
    bookChapter = q
  }

  const spaceIdx = bookChapter.lastIndexOf(' ')
  if (spaceIdx < 1) return null
  const bookPart = bookChapter.slice(0, spaceIdx)
  const chapter = parseInt(bookChapter.slice(spaceIdx + 1), 10)
  if (isNaN(chapter)) return null

  const key = bookPart.toLowerCase().replace(/\s+/g, '')
  const bookNumber = BOOK_LOOKUP[key]
  if (!bookNumber) return null

  return { bookNumber, chapter, verse }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  const v = (searchParams.get('v') ?? 'TB')

  if (!q) return NextResponse.json({ found: false, error: 'No query' })

  try {
    const db = getPresenterDb()
    const ref = parseBibleRef(q)
    if (!ref) return NextResponse.json({ found: false, error: 'Referensi tidak dikenali' })

    const bookInfo = getBookInfo(db, v, ref.bookNumber)
    if (!bookInfo) return NextResponse.json({ found: false, error: `Kitab tidak ditemukan (versi ${v})` })

    if (ref.verse) {
      // Single verse
      const verseData = getVerse(db, v, ref.bookNumber, ref.chapter, ref.verse)
      if (!verseData) return NextResponse.json({ found: false, error: 'Ayat tidak ditemukan' })
      return NextResponse.json({
        found: true,
        label: `${bookInfo.name} ${ref.chapter}:${ref.verse}`,
        text: verseData.text,
        ref: { bookNumber: ref.bookNumber, chapter: ref.chapter, verse: ref.verse, version: v },
      })
    } else {
      // Whole chapter — return first 5 verses preview
      const verses = getChapterVerses(db, v, ref.bookNumber, ref.chapter)
      if (!verses.length) return NextResponse.json({ found: false, error: 'Pasal tidak ditemukan' })
      return NextResponse.json({
        found: true,
        label: `${bookInfo.name} ${ref.chapter}:1–${verses.length}`,
        text: verses[0]!.text,
        verses: verses.slice(0, 5),
        ref: { bookNumber: ref.bookNumber, chapter: ref.chapter, version: v },
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ found: false, error: msg }, { status: 503 })
  }
}
