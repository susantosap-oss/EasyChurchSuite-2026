'use client'

import { useState } from 'react'
import { TopBar } from './TopBar'
import { StatusBar } from './StatusBar'
import { LeftPanel } from './left/LeftPanel'
import { CenterPanel } from './center/CenterPanel'
import { RightPanel } from './right/RightPanel'
import { SlideEditModal } from './center/SlideEditModal'
import type { ServiceItem, SlideBackground, TextStyle, Slide } from './types'
import { DEFAULT_TEXT_STYLE, DEFAULT_SONG_BG, DEFAULT_SCRIPTURE_BG } from './types'
import type { ScriptureAddPayload } from './left/ScriptureSearch'

const DEMO_ITEMS: Omit<ServiceItem, 'background' | 'textStyle'>[] = [
  { id: '1', type: 'song', title: 'Besar Kuasa-Mu', subtitle: 'Paul Baloche', slides: [
    { id: 's1', label: 'Verse 1', text: 'Besar kuasa-Mu ya Tuhan\nTiada yang seperti Engkau' },
    { id: 's2', label: 'Chorus',  text: 'Kau Tuhan yang menyelamatkan\nKau Tuhan yang memulihkan' },
    { id: 's3', label: 'Verse 2', text: 'Tiada yang dapat membandingkan\nKebesaran nama-Mu' },
    { id: 's4', label: 'Chorus',  text: 'Kau Tuhan yang menyelamatkan\nKau Tuhan yang memulihkan' },
    { id: 's5', label: 'Bridge',  text: 'Hallelujah, hallelujah\nKemuliaan bagi-Mu Tuhan' },
  ]},
  { id: '2', type: 'scripture', title: 'Yohanes 3:16', subtitle: 'Terjemahan Baru', slides: [
    { id: 'v1', label: 'Yoh 3:16', text: 'Karena begitu besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal' },
    { id: 'v2', label: 'Yoh 3:16', text: 'supaya setiap orang yang percaya kepada-Nya tidak binasa, melainkan beroleh hidup yang kekal.' },
    { id: 'v3', label: 'Referensi', text: 'Yohanes 3:16\nTerjemahan Baru (TB)' },
  ]},
  { id: '3', type: 'song', title: 'Yesus Kekuatan Hidupku', subtitle: 'JPCC Worship', slides: [
    { id: 'j1', label: 'Verse 1', text: 'Yesus kekuatan hidupku\nYesus cahaya jiwaku' },
    { id: 'j2', label: 'Chorus',  text: 'Kau sumber hidupku\nTempat kuberlindung' },
    { id: 'j3', label: 'Verse 2', text: 'Dalam segala keadaan\nKupercaya pada-Mu Tuhan' },
  ]},
  { id: '4', type: 'scripture', title: 'Mazmur 23:1-6', subtitle: 'Terjemahan Baru', slides: [
    { id: 'm1', label: 'Mzm 23:1', text: 'TUHAN adalah gembalaku, takkan kekurangan aku.' },
    { id: 'm2', label: 'Mzm 23:2', text: 'Ia membaringkan aku di padang yang berumput hijau; Ia membimbing aku ke air yang tenang.' },
    { id: 'm3', label: 'Mzm 23:3', text: 'Ia menyegarkan jiwaku. Ia menuntun aku di jalan yang benar oleh karena nama-Nya.' },
  ]},
  { id: '5', type: 'announcement', title: 'Pengumuman Jemaat', subtitle: '', slides: [
    { id: 'a1', label: 'Slide 1', text: 'Ibadah Doa & Puasa\nSetiap Kamis, Pkl 19.00 WIB' },
    { id: 'a2', label: 'Slide 2', text: 'Persekutuan Pemuda\nSabtu, 15 Nov 2026 · Pkl 17.00' },
  ]},
  { id: '6', type: 'song', title: 'Bapa Engkau Sungguh Baik', subtitle: 'True Worshippers', slides: [
    { id: 'b1', label: 'Verse 1', text: 'Bapa Engkau sungguh baik\nKasih-Mu melimpah padaku' },
    { id: 'b2', label: 'Chorus',  text: 'Kubersyukur, kubersyukur\nAtas segala yang Kau beri' },
  ]},
]

function makeItems(): ServiceItem[] {
  return DEMO_ITEMS.map(item => ({
    ...item,
    background: item.type === 'song' ? DEFAULT_SONG_BG : DEFAULT_SCRIPTURE_BG,
    textStyle:  { ...DEFAULT_TEXT_STYLE },
  }))
}

// Temporary "quick live" slide (Bible lookup or external)
interface QuickSlide { text: string; label: string }

export function UnifiedLayout() {
  const [items, setItems]                 = useState<ServiceItem[]>(makeItems)
  const [activeItemId, setActiveItemId]   = useState('1')
  const [activeSlideId, setActiveSlideId] = useState('s1')
  const [liveSlideId, setLiveSlideId]     = useState<string | null>(null)
  const [isBlank, setIsBlank]             = useState(false)
  const [isLive, setIsLive]               = useState(false)
  const [quickSlide, setQuickSlide]       = useState<QuickSlide | null>(null)
  const [editSlideId, setEditSlideId]     = useState<string | null>(null)

  const activeItem  = items.find(i => i.id === activeItemId) ?? items[0]!
  const activeSlide = activeItem.slides.find(s => s.id === activeSlideId) ?? activeItem.slides[0]!
  const liveSlide   = items.flatMap(i => i.slides).find(s => s.id === liveSlideId) ?? null
  const liveItem    = items.find(i => i.slides.some(s => s.id === liveSlideId)) ?? null

  // Effective background + textStyle for the live output
  const effectiveLiveSlide: Slide | null = quickSlide
    ? { id: '__quick__', label: quickSlide.label, text: quickSlide.text }
    : (isLive && !isBlank ? (liveSlide ?? activeSlide) : null)

  const liveBackground: SlideBackground = (() => {
    if (quickSlide) return DEFAULT_SCRIPTURE_BG
    const ls = liveSlide ?? activeSlide
    return ls?.backgroundOverride ?? liveItem?.background ?? activeItem.background
  })()

  const liveTextStyle: TextStyle = (() => {
    if (quickSlide) return DEFAULT_TEXT_STYLE
    const ls = liveSlide ?? activeSlide
    if (ls?.textStyleOverride) return { ...(liveItem?.textStyle ?? activeItem.textStyle), ...ls.textStyleOverride }
    return liveItem?.textStyle ?? activeItem.textStyle
  })()

  // ── Handlers ──

  const handleGoLive = () => {
    if (isLive) {
      setIsLive(false)
      setQuickSlide(null)
    } else {
      setLiveSlideId(activeSlideId)
      setIsLive(true)
      setIsBlank(false)
      setQuickSlide(null)
    }
  }

  const handleBlank = () => setIsBlank(v => !v)

  const handleNext = () => {
    setQuickSlide(null)
    const slides = activeItem.slides
    const idx = slides.findIndex(s => s.id === activeSlideId)
    const next = slides[idx + 1]
    if (next) {
      setActiveSlideId(next.id)
      if (isLive) setLiveSlideId(next.id)
    } else {
      const itemIdx  = items.findIndex(i => i.id === activeItemId)
      const nextItem = items[itemIdx + 1]
      if (nextItem) {
        setActiveItemId(nextItem.id)
        setActiveSlideId(nextItem.slides[0]!.id)
        if (isLive) setLiveSlideId(nextItem.slides[0]!.id)
      }
    }
  }

  const handlePrev = () => {
    setQuickSlide(null)
    const slides = activeItem.slides
    const idx = slides.findIndex(s => s.id === activeSlideId)
    const prev = slides[idx - 1]
    if (prev) {
      setActiveSlideId(prev.id)
      if (isLive) setLiveSlideId(prev.id)
    }
  }

  const handleSelectSlide = (id: string) => {
    setActiveSlideId(id)
    setLiveSlideId(id)
    setIsLive(true)
    setIsBlank(false)
    setQuickSlide(null)
  }

  const updateBackground = (bg: SlideBackground) =>
    setItems(prev => prev.map(i => i.id === activeItemId ? { ...i, background: bg } : i))

  const updateTextStyle = (style: Partial<TextStyle>) =>
    setItems(prev => prev.map(i =>
      i.id === activeItemId ? { ...i, textStyle: { ...i.textStyle, ...style } } : i
    ))

  const updateSlide = (slideId: string, updates: Partial<typeof activeItem.slides[0]>) =>
    setItems(prev => prev.map(item => ({
      ...item,
      slides: item.slides.map(s => s.id === slideId ? { ...s, ...updates } : s),
    })))

  // Add a Bible passage from the library as a new service item
  const handleAddScripture = ({ title, subtitle, slides }: ScriptureAddPayload) => {
    const newId = `sc_${Date.now()}`
    const newItem: ServiceItem = {
      id: newId,
      type: 'scripture',
      title,
      subtitle,
      slides: slides.map((s, i) => ({
        id: `${newId}_v${i + 1}`,
        label: s.label,
        text: s.text,
      })),
      background: { ...DEFAULT_SCRIPTURE_BG },
      textStyle: { ...DEFAULT_TEXT_STYLE },
    }
    setItems(prev => [...prev, newItem])
    setActiveItemId(newId)
    setActiveSlideId(newItem.slides[0]!.id)
  }

  // Quick launch from search (Bible verse or any text)
  const handleQuickLaunch = (text: string, label: string) => {
    setQuickSlide({ text, label })
    setIsLive(true)
    setIsBlank(false)
  }

  // Switch to service item from search
  const handleGotoItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    setActiveItemId(itemId)
    setActiveSlideId(item.slides[0]!.id)
    setLiveSlideId(item.slides[0]!.id)
    setIsLive(true)
    setIsBlank(false)
    setQuickSlide(null)
  }

  // Slide being edited
  const editingSlide = editSlideId
    ? items.flatMap(i => i.slides).find(s => s.id === editSlideId) ?? null
    : null
  const editingItem = editSlideId
    ? items.find(i => i.slides.some(s => s.id === editSlideId)) ?? activeItem
    : activeItem

  return (
    <div className="flex flex-col h-screen select-none" style={{ background: '#0f1117', color: '#f1f5f9' }}>
      <TopBar
        isLive={isLive}
        isBlank={isBlank}
        onGoLive={handleGoLive}
        onBlank={handleBlank}
        service={items}
        onQuickLaunch={handleQuickLaunch}
        onGotoItem={handleGotoItem}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftPanel
          service={items}
          activeItemId={activeItemId}
          liveItemId={liveItem?.id ?? null}
          onSelectItem={id => {
            setActiveItemId(id)
            const item = items.find(i => i.id === id)
            if (item) setActiveSlideId(item.slides[0]!.id)
          }}
          onAddScripture={handleAddScripture}
          onQuickLaunch={handleQuickLaunch}
        />

        <CenterPanel
          item={activeItem}
          activeSlideId={activeSlideId}
          liveSlideId={liveSlideId}
          onSelectSlide={handleSelectSlide}
          onEditSlide={setEditSlideId}
        />

        <RightPanel
          liveSlide={effectiveLiveSlide}
          isBlank={isBlank}
          isLive={isLive}
          onNext={handleNext}
          onPrev={handlePrev}
          onBlank={handleBlank}
          onGoLive={handleGoLive}
          activeItem={activeItem}
          liveBackground={liveBackground}
          liveTextStyle={liveTextStyle}
          onUpdateBackground={updateBackground}
          onUpdateTextStyle={updateTextStyle}
        />
      </div>

      <StatusBar
        item={activeItem}
        slide={quickSlide ? { id: '__quick__', label: quickSlide.label, text: quickSlide.text } : activeSlide}
        liveSlideId={quickSlide ? '__quick__' : liveSlideId}
        isLive={isLive}
      />

      {/* Edit slide modal */}
      {editingSlide && (
        <SlideEditModal
          slide={editingSlide}
          item={editingItem}
          onSave={updateSlide}
          onClose={() => setEditSlideId(null)}
        />
      )}
    </div>
  )
}
