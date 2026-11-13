// Minimal RTF → plain text (port of the common "striprtf" algorithm).
// Enough for EasyWorship lyrics: paragraphs, line breaks, \'hh and \uN escapes.

// Destination groups whose content is never visible text
const DESTINATIONS = new Set([
  'fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object', 'objdata', 'header', 'footer',
  'headerl', 'headerr', 'headerf', 'footerl', 'footerr', 'footerf', 'listtable', 'listoverridetable',
  'rsidtbl', 'generator', 'themedata', 'latentstyles', 'datastore', 'xmlnstbl', 'mmathPr', 'fldinst',
  'filetbl', 'revtbl', 'author', 'operator', 'title', 'subject', 'keywords', 'comment', 'doccomm',
])

const SPECIALS: Record<string, string> = {
  par: '\n', sect: '\n\n', page: '\n\n', line: '\n', tab: '\t',
  emdash: '—', endash: '–', emspace: ' ', enspace: ' ', bullet: '•',
  lquote: '‘', rquote: '’', ldblquote: '“', rdblquote: '”',
}

const TOKEN_RE = /\\([a-z]{1,32})(-?\d{1,10})?[ ]?|\\'([0-9a-f]{2})|\\([^a-z])|([{}])|[\r\n]+|([\s\S])/gi

export function rtfToText(rtf: string, codepage = 'windows-1252'): string {
  if (!rtf.trimStart().startsWith('{\\rtf')) return rtf   // already plain text
  const decoder = new TextDecoder(codepage)
  const stack: Array<[number, boolean]> = []
  let ignorable = false
  let ucskip = 1
  let curskip = 0
  const out: string[] = []

  for (const m of rtf.matchAll(TOKEN_RE)) {
    const [, word, arg, hex, char, brace, tchar] = m
    if (brace) {
      curskip = 0
      if (brace === '{') stack.push([ucskip, ignorable])
      else [ucskip, ignorable] = stack.pop() ?? [1, false]
    } else if (char) {
      curskip = 0
      if (char === '~') { if (!ignorable) out.push(' ') }
      else if ('{}\\'.includes(char)) { if (!ignorable) out.push(char) }
      else if (char === '*') ignorable = true
    } else if (word) {
      curskip = 0
      if (DESTINATIONS.has(word)) ignorable = true
      else if (ignorable) { /* skip */ }
      else if (SPECIALS[word] !== undefined) out.push(SPECIALS[word]!)
      else if (word === 'uc') ucskip = parseInt(arg ?? '1', 10)
      else if (word === 'u') {
        let c = parseInt(arg ?? '0', 10)
        if (c < 0) c += 0x10000
        out.push(String.fromCharCode(c))
        curskip = ucskip
      }
    } else if (hex) {
      if (curskip > 0) curskip--
      else if (!ignorable) out.push(decoder.decode(new Uint8Array([parseInt(hex, 16)])))
    } else if (tchar !== undefined) {
      if (curskip > 0) curskip--
      else if (!ignorable) out.push(tchar)
    }
  }

  return out.join('')
    .replace(/ /g, ' ')
    .split('\n').map(l => l.trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
