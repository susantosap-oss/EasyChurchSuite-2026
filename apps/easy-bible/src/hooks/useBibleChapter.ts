'use client'

import { useState, useEffect, useRef } from 'react'
import { BibleClient } from '@/lib/bible-client'
import type { ChapterResponse } from '@easychurch/bible-queries'

interface UseBibleChapterState {
  data: ChapterResponse | null
  loading: boolean
  error: string | null
}

export function useBibleChapter(
  version: string,
  bookNumber: number,
  chapterNumber: number,
): UseBibleChapterState {
  const [state, setState] = useState<UseBibleChapterState>({
    data: null,
    loading: true,
    error: null,
  })
  const abortRef = useRef<AbortController | null>(null)
  const prevKey = useRef('')

  useEffect(() => {
    const key = `${version}:${bookNumber}:${chapterNumber}`
    if (key === prevKey.current) return
    prevKey.current = key

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setState(s => ({ ...s, loading: true, error: null }))

    BibleClient.getChapter(version, bookNumber, chapterNumber)
      .then(data => {
        if (abortRef.current?.signal.aborted) return
        setState({ data, loading: false, error: null })
      })
      .catch(err => {
        if (abortRef.current?.signal.aborted) return
        setState(s => ({ ...s, loading: false, error: (err as Error).message }))
      })

    return () => abortRef.current?.abort()
  }, [version, bookNumber, chapterNumber])

  return state
}
