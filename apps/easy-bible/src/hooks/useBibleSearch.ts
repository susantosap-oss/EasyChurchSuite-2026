'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { BibleClient } from '@/lib/bible-client'
import type { SearchHit } from '@easychurch/bible-queries'

interface UseSearchState {
  hits: SearchHit[]
  loading: boolean
  error: string | null
  total: number
}

export function useBibleSearch(version: string, debounceMs = 300) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<UseSearchState>({
    hits: [], loading: false, error: null, total: 0,
  })
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) {
      setState({ hits: [], loading: false, error: null, total: 0 })
      return
    }

    setState(s => ({ ...s, loading: true, error: null }))
    timerRef.current = setTimeout(() => {
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      BibleClient.search(query, version)
        .then(res => {
          if (abortRef.current?.signal.aborted) return
          setState({ hits: res.hits, loading: false, error: null, total: res.total })
        })
        .catch(err => {
          if (abortRef.current?.signal.aborted) return
          setState(s => ({ ...s, loading: false, error: (err as Error).message }))
        })
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, version, debounceMs])

  const clear = useCallback(() => setQuery(''), [])

  return { query, setQuery, clear, ...state }
}
