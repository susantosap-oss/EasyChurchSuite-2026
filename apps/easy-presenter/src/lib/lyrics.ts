// Shared lyric parsing (client editor + server import) — no React here

export interface ParsedSlide { label: string; lyrics: string }

// Section label: "[Anything]" or a bare keyword like "Verse 1", "Reff", "Chorus:"
const LABEL_RE = /^\[(.+)\]$|^((?:verse|chorus|bridge|reff?|pre[-\s]?chorus|intro|outro|interlude|coda|stanza|bait|tag|ending|vamp|other)\s*\d*):?$/i

/**
 * ProPresenter-style parsing:
 * - a label line starts a new group (Verse 1, Chorus, …)
 * - every blank line starts a new slide inside the current group
 * - optional maxLines splits long blocks into slides of N lines
 */
export function parseLyrics(text: string, maxLines = 0): ParsedSlide[] {
  const blocks = text.replace(/\r\n?/g, '\n').split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean)
  const slides: ParsedSlide[] = []
  let group = ''

  for (const block of blocks) {
    let lines = block.split('\n').map(l => l.trim())
    const m = lines[0]?.match(LABEL_RE)
    if (m) {
      group = (m[1] ?? m[2] ?? lines[0]!).trim()
      lines = lines.slice(1)
    }
    lines = lines.filter(Boolean)
    if (!lines.length) continue

    const size = maxLines > 0 ? maxLines : lines.length
    for (let i = 0; i < lines.length; i += size) {
      slides.push({
        label: group || `Slide ${slides.length + 1}`,
        lyrics: lines.slice(i, i + size).join('\n'),
      })
    }
  }
  return slides
}
