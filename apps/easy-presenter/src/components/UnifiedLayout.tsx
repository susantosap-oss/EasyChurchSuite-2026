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
import type { MediaFile } from './left/MediaLibrary'

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

interface QuickSlide { text: string; label: string }

export function UnifiedLayout() {
  const [items, setItems]                 = useState<ServiceItem[]>(makeItems)
  const [activeItemId, setActiveItemId]   = useState('1')
  const [activeSlideId, setActiveSlideId] = useState('s1')
  const [liveSlideId, setLiveSlideId]     = useState<string | null>(null)
  const [isBlank, setIsBlank]             = useState(false)
  const [isClearText, setIsClearText]     = useState(false)
  const [isLive, setIsLive]               = useState(false)
  const [quickSlide, setQuickSlide]       = useState<QuickSlide | null>(null)
  const [editSlideId, setEditSlideId]     = useState<string | null>(null)

  const activeItem  = items.find(i => i.id === activeItemId) ?? items[0]!
  const activeSlide = activeItem.slides.find(s => s.id === activeSlideId) ?? activeItem.slides[0]!
  const liveSlide   = items.flatMap(i => i.slides).find(s => s.id === liveSlideId) ?? null
  const liveItem    = items.find(i => i.slides.some(s => s.id === liveSlideId)) ?? null

  const baseLiveSlide = isLive && !isBlank ? (liveSlide ?? activeSlide) : null
  const effectiveLiveSlide: Slide | null = quickSlide
    ? { id: '__quick__', label: quickSlide.label, text: quickSlide.text }
    : (isClearText && baseLiveSlide ? { ...baseLiveSlide, text: '' } : baseLiveSlide)

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

  // Media props for output panel
  const liveMediaUrl = isLive && !isBlank && !quickSlide && liveItem?.type === 'media'
    ? liveItem.mediaUrl : undefined
  const liveMediaType = isLive && !isBlank && !quickSlide && liveItem?.type === 'media'
    ? (liveItem.mediaType === 'ppt' ? undefined : liveItem.mediaType) as 'image' | 'video' | 'pdf' | undefined
    : undefined

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

  const handleBlank     = () => { setIsBlank(v => !v); setIsClearText(false) }
  const handleClearText = () => setIsClearText(v => !v)

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

  // Single click: hanya pilih untuk preview / edit
  const handleSelectSlide = (id: string) => {
    setActiveSlideId(id)
    setQuickSlide(null)
  }

  // Double click atau auto-advance tap tempo: langsung Go Live
  const handleGoLiveSlide = (id: string) => {
    setActiveSlideId(id)
    setLiveSlideId(id)
    setIsLive(true)
    setIsBlank(false)
    setIsClearText(false)
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

  const handleAddSong = (item: ServiceItem) => {
    setItems(prev => [...prev, item])
    setActiveItemId(item.id)
    setActiveSlideId(item.slides[0]!.id)
  }

  const handleAddMedia = (file: MediaFile) => {
    const newId = `media_${Date.now()}`
    const newItem: ServiceItem = {
      id: newId,
      type: 'media',
      title: file.name,
      subtitle: file.mediaType === 'video' ? 'Video' : file.mediaType === 'ppt' ? 'PowerPoint' : 'Gambar',
      slides: [{ id: `${newId}_s0`, label: file.name, text: '' }],
      background: { type: 'solid', color: '#000000' },
      textStyle: { ...DEFAULT_TEXT_STYLE },
      mediaUrl: file.url,
      mediaType: file.mediaType,
    }
    setItems(prev => [...prev, newItem])
    setActiveItemId(newId)
    setActiveSlideId(newItem.slides[0]!.id)
  }

  const handleQuickLaunch = (text: string, label: string) => {
    // Keep quickSlide for output styling (DEFAULT_SCRIPTURE_BG + DEFAULT_TEXT_STYLE)
    setQuickSlide({ text, label })
    setIsLive(true)
    setIsBlank(false)
    // Also show in CenterPanel (monitor view): add/replace a single reusable Quick item
    const qSlide = { id: '__qs__', label, text }
    const qItem: ServiceItem = {
      id: '__quick__',
      type: 'scripture',
      title: label,
      subtitle: 'Quick',
      slides: [qSlide],
      background: { ...DEFAULT_SCRIPTURE_BG },
      textStyle: { ...DEFAULT_TEXT_STYLE },
    }
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === '__quick__')
      if (idx >= 0) { const n = [...prev]; n[idx] = qItem; return n }
      return [...prev, qItem]
    })
    setActiveItemId('__quick__')
    setActiveSlideId('__qs__')
    setLiveSlideId('__qs__')
  }

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

  const handleDeleteItem = (id: string) => {
    setItems(prev => {
      if (prev.length <= 1 && id !== '__quick__') return prev
      const newItems = prev.filter(i => i.id !== id)
      if (id === activeItemId) {
        const idx = prev.findIndex(i => i.id === id)
        const next = newItems[Math.min(idx, newItems.length - 1)]!
        setActiveItemId(next.id)
        setActiveSlideId(next.slides[0]!.id)
      }
      if (id === liveItem?.id) {
        setIsLive(false)
        setLiveSlideId(null)
      }
      return newItems
    })
  }

  const handleLoadScene = (loadedItems: ServiceItem[]) => {
    if (!loadedItems.length) return
    setItems(loadedItems.filter(i => i.id !== '__quick__').map(item => ({
      ...item,
      background: item.background ?? (item.type === 'song' ? DEFAULT_SONG_BG : DEFAULT_SCRIPTURE_BG),
      textStyle: item.textStyle ?? DEFAULT_TEXT_STYLE,
    })))
    const first = loadedItems[0]!
    setActiveItemId(first.id)
    setActiveSlideId(first.slides[0]?.id ?? '')
    setLiveSlideId(null)
    setIsLive(false)
    setQuickSlide(null)
  }

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
          onDeleteItem={handleDeleteItem}
          onAddScripture={handleAddScripture}
          onAddSong={handleAddSong}
          onAddMedia={handleAddMedia}
          onQuickLaunch={handleQuickLaunch}
          onLoadScene={handleLoadScene}
        />

        <CenterPanel
          item={activeItem}
          activeSlideId={activeSlideId}
          liveSlideId={liveSlideId}
          isLive={isLive}
          onSelectSlide={handleSelectSlide}
          onGoLiveSlide={handleGoLiveSlide}
          onClearLive={handleClearText}
          isClearLive={isClearText}
          onEditSlide={setEditSlideId}
          onUpdateSlide={updateSlide}
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
          liveMediaUrl={liveMediaUrl}
          liveMediaType={liveMediaType}
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
