// Server-only: offline typo checker for song lyrics (Indonesian + English).
//
// Vocabulary, all from what the app already ships with:
//   - Bible text in the database: TB → Indonesian, KJV → English (word frequencies)
//   - EXTRA_WORDS: modern / lyric words the Bible lacks (s'lalu, forever, hallelujah…)
//   - words used in at least 2 songs of the church's own library
//   - the church dictionary (spell_words table) — words the operator marked as correct
//
// A word is only flagged when it is unknown AND a known word is 1–2 letters away
// (typo-shaped). Unknown words with nothing close (names, slang) are left alone.

import { getPresenterDb } from '@/lib/db.server'
import { EXTRA_WORDS, EXTRA_WEIGHT } from './extraWords'
import { tokenize, matchCase, LABEL_LINE_RE, type SpellIssue, type SpellLang } from './text'

type Db = import('better-sqlite3').Database
type Freq = Map<string, number>

interface Dict {
  id: Freq
  en: Freq
  songs: Freq            // document frequency in the song library (≥ 2 songs only)
  custom: Set<string>
  /** all known words bucketed by first letter + length, for distance-2 search */
  buckets: Map<string, string[]>
  cache: Map<string, string | null>
}

let bibleFreq: { id: Freq; en: Freq } | null = null
let dict: Dict | null = null

const db = () => getPresenterDb() as unknown as Db

/** Call after songs or the church dictionary change */
export function invalidateSpellDict() { dict = null }

const LATIN_RE = /^[a-zà-ɏ'’]+$/
const SPLIT_LOWER = (text: string) => tokenize(text.toLowerCase()).map(t => t.word)

function loadBible(): { id: Freq; en: Freq } {
  if (bibleFreq) return bibleFreq
  const out = { id: new Map<string, number>(), en: new Map<string, number>() }
  try {
    const rows = db().prepare(`
      SELECT v.language AS lang, a.text AS text FROM ayat a
      JOIN chapters c ON c.id = a.chapter_id
      JOIN books b ON b.id = c.book_id
      JOIN bible_versions v ON v.id = b.version_id
    `).iterate() as Iterable<{ lang: string; text: string }>
    for (const r of rows) {
      const m = r.lang === 'en' ? out.en : r.lang === 'id' ? out.id : null
      if (!m) continue
      for (const w of SPLIT_LOWER(r.text)) m.set(w, (m.get(w) ?? 0) + 1)
    }
  } catch { /* no Bible tables — extras + library only */ }
  bibleFreq = out
  return out
}

function getDict(): Dict {
  if (dict) return dict
  const bible = loadBible()
  const id = new Map(bible.id)
  const en = new Map(bible.en)
  for (const w of EXTRA_WORDS.id) id.set(w, Math.max(id.get(w) ?? 0, EXTRA_WEIGHT))
  for (const w of EXTRA_WORDS.en) en.set(w, Math.max(en.get(w) ?? 0, EXTRA_WEIGHT))

  // Words used in 2+ different songs are taken as correct (a one-off typo is not)
  const songs = new Map<string, number>()
  try {
    const rows = db().prepare(`
      SELECT s.id, s.title || char(10) || COALESCE(group_concat(sl.lyrics, char(10)), '') AS text
      FROM songs s LEFT JOIN song_slides sl ON sl.song_id = s.id GROUP BY s.id
    `).all() as { id: number; text: string }[]
    const df = new Map<string, number>()
    for (const r of rows) for (const w of new Set(SPLIT_LOWER(r.text))) df.set(w, (df.get(w) ?? 0) + 1)
    for (const [w, n] of df) if (n >= 2) songs.set(w, n)
  } catch { /* ignore */ }

  const custom = new Set<string>()
  try {
    for (const r of db().prepare('SELECT word FROM spell_words').all() as { word: string }[]) custom.add(r.word)
  } catch { /* table missing on very old DBs */ }

  const buckets = new Map<string, string[]>()
  const addBucket = (w: string) => {
    if (w.length < 3 || !LATIN_RE.test(w)) return
    const k = w[0] + w.length
    const b = buckets.get(k)
    if (b) b.push(w); else buckets.set(k, [w])
  }
  for (const w of new Set([...id.keys(), ...en.keys(), ...songs.keys(), ...custom])) addBucket(w)

  dict = { id, en, songs, custom, buckets, cache: new Map() }
  return dict
}

// ── Known-word test (with Indonesian clitics / English inflections) ──

const ID_SUFFIXES = ['nyalah', 'kulah', 'mulah', 'nya', 'ku', 'mu', 'lah', 'kah', 'pun', 'tah']
const ID_PREFIXES = ['kau', 'ku']
const EN_SUFFIXES = ['s', 'es', 'ed', 'd', 'ing', 'ly', 'er', 'est', 'ness']

function has(d: Dict, w: string): boolean {
  return d.id.has(w) || d.en.has(w) || d.songs.has(w) || d.custom.has(w)
}

function stemKnown(d: Dict, w: string): boolean {
  for (const s of ID_SUFFIXES) {
    if (w.length - s.length >= 3 && w.endsWith(s)) {
      const stem = w.slice(0, -s.length)
      if (has(d, stem)) return true
      for (const p of ID_PREFIXES) if (stem.length - p.length >= 3 && stem.startsWith(p) && has(d, stem.slice(p.length))) return true
    }
  }
  for (const p of ID_PREFIXES) if (w.length - p.length >= 3 && w.startsWith(p) && has(d, w.slice(p.length))) return true
  for (const s of EN_SUFFIXES) {
    if (w.length - s.length >= 3 && w.endsWith(s)) {
      const stem = w.slice(0, -s.length)
      if (d.en.has(stem) || (s === 'ing' && d.en.has(stem + 'e'))) return true
    }
  }
  return false
}

function isKnown(d: Dict, w: string): boolean {
  if (w.length <= 2) return true
  if (!LATIN_RE.test(w)) return true                 // other scripts (e.g. Mandarin) — not checked
  if (has(d, w)) return true
  if (/['’]/.test(w)) return true                   // lyric contractions: s'lalu, t'rima, don't
  return stemKnown(d, w)
}

// ── Suggestions ──

const ALPHA = 'abcdefghijklmnopqrstuvwxyz'

// QWERTY neighbours — hitting the key next to the right one is the most common substitution
const KB_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const KB_POS = new Map<string, [number, number]>()
KB_ROWS.forEach((row, r) => [...row].forEach((ch, c) => KB_POS.set(ch, [r, c])))
function adjacent(a: string, b: string): boolean {
  const pa = KB_POS.get(a), pb = KB_POS.get(b)
  return !!pa && !!pb && Math.abs(pa[0] - pb[0]) <= 1 && Math.abs(pa[1] - pb[1]) <= 1
}

/**
 * All 1-edit variants with a weight for how typical that typo is:
 * a dropped letter (kasi → kasih) or swapped letters (Tuahn → Tuhan) are the most common,
 * then a doubled letter (sukacitaa), a neighbouring key, any other key.
 */
function edits1(w: string): Array<[string, number]> {
  const out: Array<[string, number]> = []
  for (let i = 0; i <= w.length; i++) {
    const a = w.slice(0, i), b = w.slice(i)
    if (b) out.push([a + b.slice(1), b[0] === a.slice(-1) || b[0] === b[1] ? 1.5 : 1.1])   // extra letter typed
    if (b.length > 1) out.push([a + b[1] + b[0] + b.slice(2), 1.5])                          // letters swapped
    for (const c of ALPHA) {
      if (b && c !== b[0]) out.push([a + c + b.slice(1), adjacent(c, b[0]!) ? 1.3 : 1])      // wrong key
      out.push([a + c + b, 1.5])                                                              // letter missing
    }
  }
  return out
}

const isSwap = (a: string, b: string) =>
  a.length === b.length && [...a].sort().join('') === [...b].sort().join('')

/** Raw frequency of a known word (or of its stem for clitic forms like kasihmu) */
function freqOf(d: Dict, w: string, lang: SpellLang): number {
  const main  = lang === 'id' ? d.id : d.en
  const other = lang === 'id' ? d.en : d.id
  const direct = (main.get(w) ?? 0) + 0.3 * (other.get(w) ?? 0) + 10 * (d.songs.get(w) ?? 0) + (d.custom.has(w) ? 500 : 0)
  if (direct > 0) return direct
  if (lang === 'id') {
    for (const suf of ID_SUFFIXES) {
      if (w.length - suf.length >= 3 && w.endsWith(suf)) {
        const stem = w.slice(0, -suf.length)
        const f = (d.id.get(stem) ?? 0) + 10 * (d.songs.get(stem) ?? 0) + (d.custom.has(stem) ? 500 : 0)
        // Damped: a clitic form only counts a little of its stem's weight (kamiMu must not beat kasihMu)
        if (f > 0) return Math.pow(f, 0.6)
      }
    }
  }
  return 0
}

/** Best candidate by log-frequency × typo weight; null when none reaches `minFreq` */
function best(d: Dict, cands: Iterable<[string, number]>, lang: SpellLang, minFreq: number, self: string): string | null {
  let top: string | null = null, topScore = 0
  for (const [c, weight] of cands) {
    if (c === self || c.length < 2) continue
    const f = freqOf(d, c, lang)
    if (f < minFreq) continue
    const sc = Math.log(1 + f) * weight
    if (sc > topScore) { top = c; topScore = sc }
  }
  return top
}

/** Optimal string alignment distance, giving up once it exceeds `max` */
function osa(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev2: number[] = [], prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2]! + 1)
      cur.push(v)
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    prev2 = prev; prev = cur
  }
  return prev[b.length]!
}

function suggestLower(d: Dict, w: string, lang: SpellLang): string | null {
  const key = `${lang}:${w}`
  if (d.cache.has(key)) return d.cache.get(key)!

  // 1 letter off. 3-letter words: only a missing or swapped letter (yng → yang) — a wrong letter in
  // such a short word usually makes another valid word (tes, ten, tea) and would be a false alarm
  const e1 = edits1(w)
  let s = best(d, w.length <= 3 ? e1.filter(([c]) => c.length > w.length || isSwap(w, c)) : e1, lang, 1, w)

  // Typo in the stem of a clitic form: kasiMu → kasihMu, Tuhna-ku is split by the hyphen anyway
  if (!s && lang === 'id') {
    for (const suf of ID_SUFFIXES) {
      if (w.length - suf.length < 3 || !w.endsWith(suf)) continue
      const stem = w.slice(0, -suf.length)
      const fixed = best(d, edits1(stem), lang, 5, stem)
      if (fixed) { s = fixed + suf; break }
    }
  }

  // 2 letters off — longer words only, same first letter (first-letter typos are rare)
  if (!s && w.length >= 6) {
    const near: Array<[string, number]> = []
    for (let len = w.length - 2; len <= w.length + 2; len++) {
      for (const c of d.buckets.get(w[0] + len) ?? []) if (osa(w, c, 2) <= 2) near.push([c, 1])
    }
    s = best(d, near, lang, 5, w)
  }

  d.cache.set(key, s)
  return s
}

/** Main language of a text: whichever dictionary knows more of its words */
function detectLang(d: Dict, words: string[]): SpellLang {
  let id = 0, en = 0
  for (const w of words) {
    if (d.id.has(w)) id++
    if (d.en.has(w)) en++
  }
  return en > id ? 'en' : 'id'
}

/** Check one text (title or lyrics). Section label lines are skipped. */
export function checkText(text: string, lang?: SpellLang): { lang: SpellLang; issues: SpellIssue[] } {
  const d = getDict()
  const tokens = tokenize(text)
  const useLang = lang ?? detectLang(d, tokens.map(t => t.word.toLowerCase()))

  // Offsets of label lines ([Chorus], Reff:) to skip
  const skip: Array<[number, number]> = []
  let pos = 0
  for (const line of text.split('\n')) {
    if (LABEL_LINE_RE.test(line)) skip.push([pos, pos + line.length])
    pos += line.length + 1
  }

  const issues: SpellIssue[] = []
  for (const t of tokens) {
    if (skip.some(([a, b]) => t.start >= a && t.end <= b)) continue
    const lower = t.word.toLowerCase()
    if (isKnown(d, lower)) continue
    const s = suggestLower(d, lower, useLang)
    if (s) issues.push({ word: t.word, suggestion: matchCase(t.word, s), start: t.start, end: t.end, lang: useLang })
  }
  return { lang: useLang, issues }
}

// ── Whole-song check (library review) ──

export interface SongWordIssue {
  word: string        // first spelling seen
  suggestion: string
  count: number       // occurrences in the song
  context: string     // the first line it appears in
}

export interface SongSpellReport { id: number; title: string; artist: string; issues: SongWordIssue[] }

export function checkSongs(ids?: number[]): SongSpellReport[] {
  const conn = db()
  const songs = (ids
    ? conn.prepare(`SELECT id, title, artist FROM songs WHERE id IN (${ids.map(() => '?').join(',') || 'NULL'}) ORDER BY title COLLATE NOCASE`).all(...ids)
    : conn.prepare('SELECT id, title, artist FROM songs ORDER BY title COLLATE NOCASE').all()
  ) as { id: number; title: string; artist: string | null }[]
  const slidesOf = conn.prepare('SELECT lyrics FROM song_slides WHERE song_id = ? ORDER BY slide_order')

  const reports: SongSpellReport[] = []
  for (const song of songs) {
    const lyrics = (slidesOf.all(song.id) as { lyrics: string }[]).map(r => r.lyrics).join('\n')
    // Detect the language on the lyrics, then use it for the title too
    const body  = checkText(lyrics)
    const title = checkText(song.title, body.lang)
    const byWord = new Map<string, SongWordIssue>()
    const add = (text: string, list: SpellIssue[]) => {
      for (const i of list) {
        const k = i.word.toLowerCase()
        const cur = byWord.get(k)
        if (cur) { cur.count++; continue }
        const lineStart = text.lastIndexOf('\n', i.start - 1) + 1
        const lineEnd = text.indexOf('\n', i.end)
        byWord.set(k, {
          word: i.word, suggestion: i.suggestion, count: 1,
          context: text.slice(lineStart, lineEnd < 0 ? undefined : lineEnd).trim(),
        })
      }
    }
    add(song.title, title.issues)
    add(lyrics, body.issues)
    if (byWord.size) reports.push({ id: song.id, title: song.title, artist: song.artist ?? '', issues: [...byWord.values()] })
  }
  return reports
}

export function addCustomWord(word: string) {
  const w = word.trim().toLowerCase()
  if (!w) return
  db().prepare('INSERT OR IGNORE INTO spell_words(word) VALUES (?)').run(w)
  invalidateSpellDict()
}
