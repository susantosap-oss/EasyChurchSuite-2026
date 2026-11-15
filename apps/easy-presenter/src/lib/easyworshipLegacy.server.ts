// EasyWorship 2007 / 2009 (and older) song database reader.
//
// Those versions store songs in a Paradox table: Songs.DB (records) + Songs.MB (memo file
// holding the long fields, e.g. the RTF lyrics in "Words"). Port of the reader used by
// OpenLP's EasyWorship importer (plugins/songs/lib/importers/easyworship.py).

export interface LegacySong { title: string; author: string; words: string }

const FT_STRING = 0x01
const FT_MEMO   = 0x0c
const FT_BLOB   = 0x0d

const SQLITE_MAGIC = 'SQLite format 3\0'

export function isSqlite(buf: Buffer): boolean {
  return buf.length >= 16 && buf.toString('latin1', 0, 16) === SQLITE_MAGIC
}

/** Looks like a Paradox table: 2 KB header, block size 1–4 KB, at least one field */
export function isParadoxDb(buf: Buffer): boolean {
  if (buf.length < 0x800 || isSqlite(buf)) return false
  const headerSize = buf.readInt16LE(2)
  const blockSize  = buf.readInt8(5)
  const numFields  = buf.readInt16LE(33)
  return headerSize === 0x800 && blockSize >= 1 && blockSize <= 4 && numFields >= 1
}

/** Paradox DOS code page → Windows encoding of the text (same guesses as OpenLP) */
function encodingFor(codePage: number): string {
  switch (codePage) {
    case 852: return 'windows-1250'
    case 737: case 869: return 'windows-1253'
    case 775: return 'windows-1257'
    case 855: case 866: return 'windows-1251'
    case 857: return 'windows-1254'
    case 862: return 'windows-1255'
    case 874: return 'windows-874'
    default:  return 'windows-1252'
  }
}

interface Field { name: string; type: number; size: number; offset: number }

export function readEasyWorshipLegacy(db: Buffer, mb: Buffer): { songs: LegacySong[]; encoding: string } {
  if (!isParadoxDb(db)) throw new Error('Songs.DB bukan database EasyWorship lama (format Paradox) yang valid')

  const recordSize = db.readInt16LE(0)
  const headerSize = db.readInt16LE(2)
  const blockSize  = db.readInt8(5)
  const firstBlock = db.readInt16LE(14)
  const numFields  = db.readInt16LE(33)
  const encoding   = encodingFor(db.readInt16LE(106))
  const decoder    = new TextDecoder(encoding)

  // Field types/sizes at 120, names after a fixed-size gap, NUL-separated up to the header end
  const infoEnd   = 120 + numFields * 2
  const namesFrom = infoEnd + 4 + numFields * 4 + 261
  const names = db.subarray(namesFrom, headerSize).toString('latin1').split('\0').slice(0, numFields)

  const fields: Field[] = []
  let offset = 0
  for (let i = 0; i < numFields; i++) {
    const type = db[120 + i * 2]!
    const size = db[121 + i * 2]!
    fields.push({ name: names[i] ?? '', type, size, offset })
    offset += size
  }
  const find = (name: string) => fields.find(f => f.name.toLowerCase() === name.toLowerCase())
  const fTitle  = find('Title')
  const fAuthor = find('Author')
  const fWords  = find('Words')
  if (!fTitle || !fWords) throw new Error('Songs.DB tidak berisi kolom Title / Words EasyWorship')

  const readField = (rec: Buffer, f: Field): Buffer | null => {
    const raw = rec.subarray(f.offset, f.offset + f.size)
    if (!raw.some(b => b !== 0)) return null
    if (f.type === FT_STRING) {
      let end = raw.length
      while (end > 0 && raw[end - 1] === 0) end--
      return raw.subarray(0, end)
    }
    if (f.type === FT_MEMO || f.type === FT_BLOB) {
      // Last 10 bytes: offset in the .MB (low byte = sub-block index), length, modification number
      let blockStart = raw.readUInt32LE(raw.length - 10)
      const blobSize = raw.readUInt32LE(raw.length - 6)
      const subBlock = blockStart & 0xff
      blockStart -= subBlock
      if (blockStart >= mb.length) return null
      const blockType = mb.readInt8(blockStart)
      let dataStart: number
      if (blockType === 2) {
        dataStart = blockStart + 9                      // single blob block
      } else if (blockType === 3) {
        if (subBlock > 63) return Buffer.alloc(0)       // sub-allocated block: 64 small blobs max
        dataStart = blockStart + mb[blockStart + 12 + 5 * subBlock]! * 16
      } else {
        return Buffer.alloc(0)
      }
      return mb.subarray(dataStart, Math.min(mb.length, dataStart + blobSize))
    }
    return null
  }

  // Walk the linked list of data blocks; each holds (lastRecordOffset / recordSize) + 1 records
  const songs: LegacySong[] = []
  const seen = new Set<number>()
  let block = firstBlock
  while (block > 0 && !seen.has(block)) {
    seen.add(block)
    const pos = headerSize + (block - 1) * 1024 * blockSize
    if (pos + 6 > db.length) break
    const next     = db.readInt16LE(pos)
    const lastOff  = db.readInt16LE(pos + 4)
    const count    = Math.floor(lastOff / recordSize) + 1
    for (let i = 0; i < count; i++) {
      const start = pos + 6 + i * recordSize
      if (start + recordSize > db.length) break
      const rec = db.subarray(start, start + recordSize)
      const title  = readField(rec, fTitle)
      const author = fAuthor ? readField(rec, fAuthor) : null
      const words  = readField(rec, fWords)
      songs.push({
        title:  title ? decoder.decode(title).trim() : '',
        author: author ? decoder.decode(author).trim() : '',
        // RTF is 7-bit (\'hh escapes); latin1 keeps every byte for rtfToText
        words:  words ? words.toString('latin1') : '',
      })
    }
    block = next
  }
  return { songs, encoding }
}
