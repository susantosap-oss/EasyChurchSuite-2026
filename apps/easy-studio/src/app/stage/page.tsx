'use client'

import { useEffect, useState } from 'react'

interface StageState {
  currentText: string
  nextText: string
  chords: string
  reference: string
}

export default function StagePage() {
  const [stage, setStage] = useState<StageState>({
    currentText: '',
    nextText: '',
    chords: '',
    reference: '',
  })
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const cleanup = window.studioAPI?.onStageUpdate((data) => {
      setStage(data as StageState)
    })
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => { cleanup?.(); clearInterval(timer) }
  }, [])

  return (
    <div className="w-screen h-screen bg-black flex flex-col" style={{ cursor: 'none' }}>
      {/* Current slide — large */}
      <div className="flex-1 flex flex-col items-center justify-center px-16 border-b border-white/10">
        <p className="text-white text-5xl font-bold text-center leading-tight">
          {stage.currentText || 'Waiting for presenter...'}
        </p>
        {stage.chords && (
          <p className="mt-6 text-yellow-300 text-2xl font-mono tracking-widest">
            {stage.chords}
          </p>
        )}
        {stage.reference && (
          <p className="mt-4 text-slate-400 text-xl">{stage.reference}</p>
        )}
      </div>

      {/* Footer: next + clock */}
      <div className="h-32 flex items-center px-16">
        <div className="flex-1">
          <p className="text-slate-600 text-sm uppercase tracking-widest mb-1">Next</p>
          <p className="text-slate-300 text-xl">{stage.nextText || '—'}</p>
        </div>
        <div className="text-white text-5xl font-mono font-bold">
          {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}
