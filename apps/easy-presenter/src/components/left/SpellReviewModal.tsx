'use client'

import { useEffect, useState } from 'react'
import { WordFixChip, addToDictionary, type WordIssue } from './SpellCheck'

interface SongReport {
  id: number
  title: string
  artist: string
  issues: Array<WordIssue & { context: string }>
}

interface Props {
  /** Only these songs (e.g. just imported); all songs when omitted */
  ids?: number[]
  onClose: () => void
  /** Called on close when at least one song was changed */
  onChanged: () => void
}

/** Library-wide typo review: every song with possible typos, fix per word / per song / all at once */
export function SpellReviewModal({ ids, onClose, onChanged }: Props) {
  const [songs, setSongs]     = useState<SongReport[] | null>(null)
  const [error, setError]     = useState('')
  const [busy, setBusy]       = useState<number | 'all' | null>(null)
  const [progress, setProgress] = useState('')
  const [changed, setChanged] = useState(0)    // number of words fixed

  useEffect(() => {
    const q = ids ? `?ids=${ids.join(',')}` : ''
    fetch(`/api/spell/songs/${q}`)
      .then(r => r.json() as Promise<{ songs?: SongReport[]; error?: string }>)
      .then(d => { if (d.error) throw new Error(d.error); setSongs(d.songs ?? []) })
      .catch(e => { setError(e instanceof Error ? e.message : 'Gagal memeriksa ejaan'); setSongs([]) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => { if (changed) onChanged(); onClose() }

  const dropWords = (songId: number | null, words: string[]) => {
    const drop = new Set(words.map(w => w.toLowerCase()))
    setSongs(prev => (prev ?? [])
      .map(s => (songId == null || s.id === songId)
        ? { ...s, issues: s.issues.filter(i => !drop.has(i.word.toLowerCase())) }
        : s)
      .filter(s => s.issues.length))
  }

  const applyFixes = async (song: SongReport, fixes: Array<{ from: string; to: string }>) => {
    const res = await fetch(`/api/songs/${song.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fixes }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok || data.error) throw new Error(data.error ?? 'Gagal menyimpan')
    setChanged(n => n + fixes.length)
    dropWords(song.id, fixes.map(f => f.from))
  }

  const run = async (key: number | 'all', fn: () => Promise<void>) => {
    setBusy(key); setError('')
    try { await fn() } catch (e) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan') }
    finally { setBusy(null); setProgress('') }
  }

  const fixOne    = (song: SongReport, from: string, to: string) => run(song.id, () => applyFixes(song, [{ from, to }]))
  const fixSong   = (song: SongReport) => run(song.id, () => applyFixes(song, song.issues.map(i => ({ from: i.word, to: i.suggestion }))))
  const fixAll    = () => run('all', async () => {
    const list = songs ?? []
    for (let i = 0; i < list.length; i++) {
      setProgress(`${i + 1}/${list.length}`)
      await applyFixes(list[i]!, list[i]!.issues.map(x => ({ from: x.word, to: x.suggestion })))
    }
  })
  const addDict = async (word: string) => {
    await addToDictionary(word)
    dropWords(null, [word])     // correct everywhere, not just in this song
  }

  const totalWords = (songs ?? []).reduce((n, s) => n + s.issues.length, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget && busy == null) close() }}>
      <div className="flex flex-col rounded-2xl overflow-hidden"
        style={{ width: 'min(860px, 94vw)', height: '84vh', background: '#161b27', border: '1px solid #2a3347' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #2a3347', background: '#1a2235' }}>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>
              Periksa Ejaan Lagu{ids ? ' — hasil import' : ''}
            </h2>
            <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
              Bahasa Indonesia &amp; Inggris · saran bisa diedit sebelum ✓ · “+ Kamus” = kata itu benar, tidak ditandai lagi
            </p>
          </div>
          {songs && songs.length > 0 && (
            <button onClick={fixAll} disabled={busy != null}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold flex-shrink-0"
              style={{ background: '#14532d', color: '#86efac', border: '1px solid #166534', opacity: busy != null ? 0.6 : 1 }}>
              {busy === 'all' ? `Memperbaiki… ${progress}` : `✓ Perbaiki semua (${totalWords} kata · ${songs.length} lagu)`}
            </button>
          )}
          <button onClick={close} disabled={busy != null} className="text-lg leading-none" style={{ color: '#94a3b8' }}>×</button>
        </div>

        {error && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-lg text-xs" style={{ background: '#3b1515', color: '#fca5a5' }}>{error}</div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-0">
          {songs == null && (
            <div className="h-full flex items-center justify-center text-xs" style={{ color: '#94a3b8' }}>
              Memeriksa ejaan semua lagu…
            </div>
          )}
          {songs && songs.length === 0 && !error && (
            <div className="h-full flex flex-col items-center justify-center gap-1 text-center">
              <div className="text-2xl">✓</div>
              <p className="text-sm font-semibold" style={{ color: '#86efac' }}>
                {changed ? `Selesai — ${changed} kata diperbaiki` : 'Tidak ditemukan typo'}
              </p>
            </div>
          )}
          {songs?.map(song => (
            <div key={song.id} className="rounded-xl p-3"
              style={{ background: '#0f1117', border: '1px solid #2a3347', opacity: busy === song.id ? 0.6 : 1 }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold" style={{ color: '#f1f5f9' }}>{song.title}</span>
                  {song.artist && <span className="text-[10px] ml-2" style={{ color: '#64748b' }}>{song.artist}</span>}
                </div>
                {song.issues.length > 1 && (
                  <button onClick={() => fixSong(song)} disabled={busy != null}
                    className="text-[10px] px-2 py-0.5 rounded font-semibold flex-shrink-0"
                    style={{ background: '#14532d', color: '#86efac' }}>✓ Perbaiki lagu ini</button>
                )}
              </div>
              <div className="space-y-1.5">
                {song.issues.map(i => (
                  <div key={i.word.toLowerCase()} className="flex items-center gap-2 min-w-0">
                    <WordFixChip issue={i} busy={busy != null}
                      onFix={to => fixOne(song, i.word, to)}
                      onIgnore={() => dropWords(song.id, [i.word])}
                      onAddDict={() => addDict(i.word)}
                    />
                    <span className="text-[10px] italic truncate min-w-0" style={{ color: '#64748b' }} title={i.context}>
                      “{i.context}”
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
