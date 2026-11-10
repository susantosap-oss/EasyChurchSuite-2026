/**
 * Client-side Bible API wrapper.
 * In web/dev: calls Next.js Route Handlers (/api/bible/*)
 * In Capacitor native: TODO — swap to @capacitor-community/sqlite calls
 */

import type {
  BooksResponse,
  ChapterResponse,
  SearchResponse,
  VersionsResponse,
} from '@easychurch/bible-queries'

const BASE = '/api/bible'

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) sp.set(k, String(v))
  const url = `${BASE}${path}?${sp.toString()}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function del<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const BibleClient = {
  getVersions: () =>
    get<VersionsResponse>('/versions', {}),

  getBooks: (version: string) =>
    get<BooksResponse>('/books', { v: version }),

  getChapter: (version: string, bookNumber: number, chapterNumber: number) =>
    get<ChapterResponse>('/chapter', { v: version, b: bookNumber, c: chapterNumber }),

  search: (query: string, version: string, limit = 50) =>
    get<SearchResponse>('/search', { q: query, v: version, limit }),

  setHighlight: (verseId: number, color: string) =>
    post<{ ok: boolean }>('/highlights', { verseId, color }),

  removeHighlight: (verseId: number) =>
    del<{ ok: boolean }>('/highlights', { verseId }),
}
