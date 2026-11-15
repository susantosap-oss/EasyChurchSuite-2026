// Spell-check text helpers shared by the client (editor) and the server (checker).
// No dictionary here — see spell.server.ts.

export type SpellLang = 'id' | 'en'

export interface SpellIssue {
  word: string          // as written in the text
  suggestion: string    // same casing style as `word`
  start: number         // offset in the checked text
  end: number
  lang: SpellLang
}

/** Letters, optionally joined by an apostrophe (s'lalu, don't). Hyphens split words: nama-Mu → nama, Mu */
const WORD_RE = /\p{L}+(?:['’]\p{L}+)*/gu

export interface Token { word: string; start: number; end: number }

export function tokenize(text: string): Token[] {
  const out: Token[] = []
  for (const m of text.matchAll(WORD_RE)) {
    out.push({ word: m[0], start: m.index!, end: m.index! + m[0].length })
  }
  return out
}

/** Lyric section labels ([Verse 1], Chorus:, Reff) are not lyrics — skip them when checking */
export const LABEL_LINE_RE = /^\s*(?:\[.*\]|(?:verse|chorus|bridge|reff?|pre[-\s]?chorus|intro|outro|interlude|coda|stanza|bait|tag|ending|vamp|other)\s*\d*:?)\s*$/i

/** Give `suggestion` the casing style of `original`: TUHAN, Tuhan, tuhan, kasihMu */
export function matchCase(original: string, suggestion: string): string {
  if (original.length > 1 && original === original.toUpperCase()) return suggestion.toUpperCase()
  let s = suggestion.toLowerCase()
  if (original[0] && original[0] !== original[0].toLowerCase()) s = s[0]!.toUpperCase() + s.slice(1)
  // Capitalised pronoun suffix for God: kasihMu, nama-Nya, hatiKu
  const suf = original.match(/(Mu|Nya|Ku)$/)
  if (suf && s.toLowerCase().endsWith(suf[1]!.toLowerCase())) {
    s = s.slice(0, s.length - suf[1]!.length) + suf[1]
  }
  return s
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Replace every whole-word occurrence of `from` (case-insensitive) with `to`,
 * keeping each occurrence's casing. Returns the new text and how many were replaced.
 */
export function replaceWord(text: string, from: string, to: string): { text: string; count: number } {
  let count = 0
  const re = new RegExp(`(?<![\\p{L}'’])${escapeRe(from)}(?![\\p{L}'’])`, 'giu')
  const out = text.replace(re, m => { count++; return matchCase(m, to) })
  return { text: out, count }
}
