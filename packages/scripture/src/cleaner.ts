/**
 * Cleans Yuku .YES file markup tags from raw Bible verse text.
 * Known Yuku markup: @9, @7, @6, @0, @1–@8, {{...}} footnote markers.
 */

const YUKU_MARKUP_PATTERNS: RegExp[] = [
  /\{\{[^}]*\}\}/g,    // {{footnote markers}}
  /@[0-9A-Za-z]+/g,    // @0 @1 @6 @7 @9 etc.
  /\[([^\]]*)\]/g,      // [text] inline markers (keep content if needed)
  /<[^>]+>/g,           // any residual HTML/XML tags
]

export function cleanYukuMarkup(raw: string): string {
  let text = raw

  for (const pattern of YUKU_MARKUP_PATTERNS) {
    text = text.replace(pattern, '')
  }

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim()

  return text
}

export function normalizeVerseText(text: string): string {
  return text
    .replace(/ /g, ' ')   // non-breaking space → regular space
    .replace(/[​-‍﻿]/g, '') // zero-width chars
    .replace(/\s+/g, ' ')
    .trim()
}
