export interface VersionInfo {
  id: number
  code: string
  name: string
  language: string
  direction: 'ltr' | 'rtl'
  isDefault: boolean
}

export interface BookInfo {
  id: number
  number: number
  code: string
  name: string
  nameAbbr: string
  testament: 'OT' | 'NT'
  totalChapters: number
}

export interface ChapterInfo {
  id: number
  number: number
  totalVerses: number
}

export interface VerseData {
  id: number
  verseNumber: number
  text: string
}

export interface SearchHit {
  id: number
  verseNumber: number
  text: string
  snippet: string
  bookName: string
  bookAbbr: string
  bookNumber: number
  chapterNumber: number
  versionCode: string
}

export interface HighlightData {
  verseId: number
  color: string
}

export interface NoteData {
  id: number
  ayatId: number
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

// API response shapes (used by both Route Handlers and client hooks)
export interface BooksResponse {
  version: string
  books: BookInfo[]
}

export interface ChapterResponse {
  version: string
  bookNumber: number
  bookName: string
  bookAbbr: string
  chapterNumber: number
  totalChapters: number
  totalVerses: number
  verses: VerseData[]
  highlights: Record<number, string>
}

export interface SearchResponse {
  query: string
  version: string
  total: number
  hits: SearchHit[]
}

export interface VersionsResponse {
  versions: VersionInfo[]
}
