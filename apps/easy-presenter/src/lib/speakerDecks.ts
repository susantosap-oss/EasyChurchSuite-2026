'use client'
// Media files the operator marked [v] for the Speaker remote. One shared list for the Media
// library (checkboxes) and the operator window (phone snapshot / commands).
import { useEffect, useState } from 'react'

export interface SpeakerDeck {
  /** Stored media file name (MediaFile.id) */
  file: string
  name: string
  kind: 'pdf' | 'image' | 'video'
  url: string
  /** PDF: one rendered image URL per page; image / video: empty */
  pages: string[]
}

let decks: SpeakerDeck[] = []
let loaded = false
const subscribers = new Set<(d: SpeakerDeck[]) => void>()

export async function reloadSpeakerDecks(): Promise<void> {
  const d = await fetch('/api/media/speaker/').then(r => r.json() as Promise<{ decks?: SpeakerDeck[] }>)
  decks = d.decks ?? []
  subscribers.forEach(fn => fn(decks))
}

export function useSpeakerDecks(): SpeakerDeck[] {
  const [state, setState] = useState(decks)
  useEffect(() => {
    subscribers.add(setState)
    if (!loaded) { loaded = true; reloadSpeakerDecks().catch(() => {}) }
    return () => { subscribers.delete(setState) }
  }, [])
  return state
}

export async function markSpeakerDeck(deck: SpeakerDeck): Promise<void> {
  const res  = await fetch('/api/media/speaker/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(deck),
  })
  const data = await res.json() as { error?: string }
  if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`)
  await reloadSpeakerDecks()
}

export async function unmarkSpeakerDeck(file: string): Promise<void> {
  await fetch(`/api/media/speaker/?file=${encodeURIComponent(file)}`, { method: 'DELETE' })
  await reloadSpeakerDecks()
}
