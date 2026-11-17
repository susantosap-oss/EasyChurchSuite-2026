'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { TopBar } from './TopBar'
import { StatusBar } from './StatusBar'
import { SecondScreenNotice } from './SecondScreenNotice'
import { RemoteModal } from './RemoteModal'
import { ITEM_KIND, remoteBg, type RemoteCommand, type RemoteSnapshot } from '@/lib/remote'
import { useSpeakerDecks, markSpeakerDeck, type SpeakerDeck } from '@/lib/speakerDecks'
import { convertPdfToSlides } from '@/lib/pdfToSlides'
import { LeftPanel } from './left/LeftPanel'
import { CenterPanel } from './center/CenterPanel'
import { RightPanel } from './right/RightPanel'
import { SlideEditModal } from './center/SlideEditModal'
import { useBgLibrary } from './center/BackgroundPanels'
import { useAppSettings } from './settings/useAppSettings'
import { applyAppDefaults, defaultTextStyle, chromaColor, chromaApplies } from './settings/appSettings'
import { SettingsModal } from './settings/SettingsModal'
import { switchWall } from '@/lib/matrix'
import { openOutputChannel, type OutputMessage, type OutputState, type RunningText } from '@/lib/outputBus'
import type { ServiceItem, SlideBackground, TextStyle, Slide } from './types'
import { DEFAULT_TEXT_STYLE, DEFAULT_SONG_BG, DEFAULT_SCRIPTURE_BG, resolveTextStyle, pickedBackground, withUniqueSlideIds, songIdOf } from './types'
import { AddSongModal, SONG_EDITED, type EditableSong } from './left/AddSongModal'
import type { SceneRef } from './left/SaveSceneModal'
import type { TextAnimation, MediaControl, MediaStatus } from './types'
import { DEFAULT_MEDIA_CONTROL, DEFAULT_TEXT_ANIMATION } from './types'
import { TEXT_ANIM_PRESETS, presetAnimation, presetNameOf } from './center/TextAnimationPanel'
import type { ScriptureAddPayload } from './left/ScriptureSearch'
import type { MediaFile } from './left/MediaLibrary'
import { useUiScale } from '@/hooks/useUiScale'

// Shown while the Urutan Ibadah is empty; never part of `items`, so edits to it are no-ops
const EMPTY_ITEM: ServiceItem = {
  id: '__empty__', type: 'announcement', title: '', subtitle: '',
  slides: [{ id: '__empty_s__', label: '', text: '' }],
  background: DEFAULT_SCRIPTURE_BG,
  textStyle: DEFAULT_TEXT_STYLE,
}

/** A verse put on air from a search box; version lets Prev / Next step to the neighbouring verse */
/** Service items opened from the Speaker remote: "spk_<media file>" */
const DECK_PREFIX = 'spk_'
/** Service items opened from the Operator remote's Media tab: "lib_<media file>" */
const LIB_PREFIX = 'lib_'

const deckToMedia = (d: SpeakerDeck): MediaFile => ({
  id: d.file, name: d.name, url: d.url, size: 0,
  mediaType: d.pages.length ? 'slides' : d.kind,
  pages: d.pages.length ? d.pages : undefined,
})

interface QuickSlide { text: string; label: string; version: string }

export function UnifiedLayout() {
  const [items, setItems]                 = useState<ServiceItem[]>([])
  const [activeItemId, setActiveItemId]   = useState('')
  const [activeSlideId, setActiveSlideId] = useState('')
  const [liveSlideId, setLiveSlideId]     = useState<string | null>(null)
  const [isBlank, setIsBlank]             = useState(false)
  const [isClearText, setIsClearText]     = useState(false)
  const [isLive, setIsLive]               = useState(false)
  const [quickSlide, setQuickSlide]       = useState<QuickSlide | null>(null)
  const [runningText, setRunningText]     = useState<RunningText | null>(null)
  const [showRemote, setShowRemote]       = useState(false)
  const [remoteClients, setRemoteClients] = useState<RemoteInfo['clients']>({ operator: 0, speaker: 0 })
  const speakerDecks                      = useSpeakerDecks()
  // A marked PDF without pages (a ✓ Speaker PPTX that was converted to PDF): render its pages once
  const deckRendering = useRef(new Set<string>())
  useEffect(() => {
    const deck = speakerDecks.find(d => d.kind === 'pdf' && !d.pages.length && !deckRendering.current.has(d.file))
    if (!deck) return
    deckRendering.current.add(deck.file)
    void (async () => {
      const blob  = await fetch(deck.url).then(r => r.blob())
      const pages = await convertPdfToSlides(new File([blob], `${deck.name}.pdf`, { type: 'application/pdf' }))
      if (pages.length && pages.every(p => p.startsWith('/api/'))) await markSpeakerDeck({ ...deck, pages })
    })().catch(() => { /* stays without pages; retried on the next launch */ })
  }, [speakerDecks])
  const [editSlideId, setEditSlideId]     = useState<string | null>(null)
  const bgLibrary                         = useBgLibrary()
  const { settings: appSettings, save: saveAppSettings } = useAppSettings()
  const [showSettings, setShowSettings]   = useState(false)
  const ui = useUiScale()
  const [scaleToast, setScaleToast]       = useState(false)
  useEffect(() => {
    if (!ui.changedAt) return
    setScaleToast(true)
    const t = setTimeout(() => setScaleToast(false), 1500)
    return () => clearTimeout(t)
  }, [ui.changedAt])
  const [currentScene, setCurrentScene]   = useState<SceneRef | null>(null)
  // Wall mode — the matrix state is not read back, so the app starts assuming OFF
  const [wallOn, setWallOn]               = useState(false)
  const [wallBusy, setWallBusy]           = useState(false)
  const [wallMsg, setWallMsg]             = useState<{ ok: boolean; text: string; sticky: boolean } | null>(null)
  useEffect(() => {
    if (!wallMsg || wallMsg.sticky) return
    const t = setTimeout(() => setWallMsg(null), 3500)
    return () => clearTimeout(t)
  }, [wallMsg])
  const [mediaControl, setMediaControl]   = useState<MediaControl>(DEFAULT_MEDIA_CONTROL)
  const [mediaStatus, setMediaStatus]     = useState<MediaStatus>({ url: null, currentTime: 0, duration: 0, ended: false })

  const activeItem  = items.find(i => i.id === activeItemId) ?? items[0] ?? EMPTY_ITEM
  const isEmpty     = activeItem === EMPTY_ITEM
  const activeSlide = activeItem.slides.find(s => s.id === activeSlideId) ?? activeItem.slides[0]!
  const liveSlide   = items.flatMap(i => i.slides).find(s => s.id === liveSlideId) ?? null
  const liveItem    = items.find(i => i.slides.some(s => s.id === liveSlideId)) ?? null

  const baseLiveSlide = isLive && !isBlank ? (liveSlide ?? activeSlide) : null
  const liveIsScripture = quickSlide != null || (liveItem ?? activeItem).type === 'scripture'
  // Scripture on the output: reference on its own line above the quoted verse (Settings ⚙ → Teks → Ayat Alkitab)
  const withReference = (s: Slide): Slide =>
    liveIsScripture && appSettings.scripture.showReference && s.label && s.text
      ? { ...s, text: `${s.label}\n“${s.text}”` }
      : s
  const rawLiveSlide: Slide | null = quickSlide
    ? { id: '__quick__', label: quickSlide.label, text: quickSlide.text }
    : baseLiveSlide
  // Clear text: empty text, the background stays on screen (quick verses too)
  const effectiveLiveSlide: Slide | null = rawLiveSlide && (isClearText ? { ...rawLiveSlide, text: '' } : withReference(rawLiveSlide))

  const quickItem = items.find(i => i.id === '__quick__')

  const liveBackground: SlideBackground = (() => {
    // Quick-launched verse: use the reusable Quick item's background (Format panel / playlist)
    if (quickSlide) return (quickItem && (pickedBackground(quickItem) ?? quickItem.background)) ?? appSettings.display1.scriptureBackground
    // Operator-picked background from the playlist wins (songs, announcements, scripture)
    const bgItem = liveItem ?? activeItem
    const picked = pickedBackground(bgItem)
    if (picked && bgItem.type !== 'media') return picked
    const ls = liveSlide ?? activeSlide
    return ls?.backgroundOverride ?? liveItem?.background ?? activeItem.background
  })()

  const liveTextStyle: TextStyle = (() => {
    if (quickSlide) return quickItem ? resolveTextStyle(quickItem, quickItem.slides[0]) : defaultTextStyle(appSettings)
    return resolveTextStyle(liveItem ?? activeItem, liveSlide ?? activeSlide)
  })()

  // Media props for output panel — presentation decks ('slides') render as normal slides instead
  const isLiveMediaPlayer = isLive && !isBlank && !quickSlide && liveItem?.type === 'media'
    && liveItem.mediaType !== 'slides' && liveItem.mediaType !== 'ppt'
  const liveMediaUrl  = isLiveMediaPlayer ? liveItem!.mediaUrl : undefined
  const liveMediaType = isLiveMediaPlayer
    ? liveItem!.mediaType as 'image' | 'video' | 'pdf' | undefined
    : undefined

  // A new live video starts playing; mute / volume carry over between videos
  useEffect(() => {
    if (liveMediaUrl) setMediaControl(c => ({ ...c, playing: true }))
  }, [liveMediaUrl])

  const updateMediaControl = useCallback((patch: Partial<MediaControl>) =>
    setMediaControl(c => ({ ...c, ...patch })), [])

  const handleMediaStatus = useCallback((s: MediaStatus) => {
    setMediaStatus(s)
    if (s.ended) setMediaControl(c => (c.loop || !c.playing ? c : { ...c, playing: false }))
  }, [])

  // ── Live state → output windows (/output?display=1|2) ──
  const out1 = appSettings.output.display1
  const out2 = appSettings.output.display2
  const outputState: OutputState = {
    blank: isBlank || !isLive,
    slide: effectiveLiveSlide ? { text: effectiveLiveSlide.text, image: effectiveLiveSlide.image } : null,
    itemType: quickSlide ? 'scripture' : (liveItem ?? activeItem).type,
    background: liveBackground,
    textStyle: liveTextStyle,
    media: liveMediaUrl && liveMediaType ? { url: liveMediaUrl, type: liveMediaType } : null,
    video: liveMediaType === 'video' && mediaStatus.url === liveMediaUrl
      ? { playing: mediaControl.playing && !mediaStatus.ended, currentTime: mediaStatus.currentTime, loop: mediaControl.loop }
      : null,
    runningText,
    key: {
      display1: { color: chromaColor(out1), for: out1.chromaFor, subtitle: out1.subtitle, subtitleSize: out1.subtitleSize },
      display2: { color: chromaColor(out2), for: out2.chromaFor, subtitle: out2.subtitle, subtitleSize: out2.subtitleSize },
    },
    display2: appSettings.display2,
    display2Mode: appSettings.output.display2.mode,
    lowSpec: appSettings.performance.lowSpecMode,
  }
  const outputJson    = JSON.stringify(outputState)
  const outputChannel = useRef<BroadcastChannel | null>(null)
  const outputLatest  = useRef(outputState)
  outputLatest.current = outputState

  useEffect(() => {
    const ch = openOutputChannel()
    outputChannel.current = ch
    if (ch) {
      ch.onmessage = (e: MessageEvent<OutputMessage>) => {
        if (e.data.type === 'request-state') ch.postMessage({ type: 'state', state: outputLatest.current } satisfies OutputMessage)
      }
    }
    return () => { ch?.close(); outputChannel.current = null }
  }, [])

  useEffect(() => {
    outputChannel.current?.postMessage({ type: 'state', state: JSON.parse(outputJson) as OutputState } satisfies OutputMessage)
  }, [outputJson])

  // Settings ⚙ → "Buat Scene": start a new, saved Urutan Ibadah with one welcome slide
  const handleCreateScene = async (name: string, date: string | null) => {
    const id = `ann_${Date.now()}`
    const first: ServiceItem = {
      id, type: 'announcement', title: 'Selamat Datang', subtitle: name,
      slides: [{ id: `${id}_s1`, label: 'Slide 1', text: `Selamat Datang
${name}` }],
      background: { ...appSettings.display1.scriptureBackground },
      textStyle: defaultTextStyle(appSettings),
    }
    const res  = await fetch('/api/scenes/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, service_date: date, items: [first] }),
    })
    const data = await res.json() as { id?: number; error?: string }
    if (!res.ok || !data.id) throw new Error(data.error ?? 'Gagal membuat scene')
    setItems([first])
    setActiveItemId(first.id)
    setActiveSlideId(first.slides[0]!.id)
    setLiveSlideId(null)
    setIsLive(false)
    setQuickSlide(null)
    setCurrentScene({ id: data.id, name, date })
  }

  // ── Handlers ──

  const handleGoLive = () => {
    if (isEmpty && !isLive) return
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

  // Quick verse on air: Prev / Next go to the previous / next verse ("Yoh 3:16" → "Yoh 3:17")
  const stepQuickVerse = (delta: 1 | -1): boolean => {
    const m = quickSlide?.label.match(/^(.+?)\s+(\d+):(\d+)$/)
    if (!quickSlide || !m) return false
    const verse = Number(m[3]) + delta
    if (verse < 1) return true
    const { version } = quickSlide
    fetch(`/api/quick-search/?q=${encodeURIComponent(`${m[1]} ${m[2]}:${verse}`)}&v=${encodeURIComponent(version)}`)
      .then(r => r.json() as Promise<{ found: boolean; label?: string; text?: string }>)
      .then(d => { if (d.found && d.label && d.text) handleQuickLaunch(d.text, d.label, version) })
      .catch(() => {})
    return true
  }

  const handleNext = () => {
    if (stepQuickVerse(1)) return
    setQuickSlide(null)
    const slides = activeItem.slides
    const idx = slides.findIndex(s => s.id === activeSlideId)
    const next = slides[idx + 1]
    if (next) {
      setActiveSlideId(next.id)
      if (isLive) setLiveSlideId(next.id)
    } else {
      const itemIdx  = items.findIndex(i => i.id === activeItem.id)
      const nextItem = items[itemIdx + 1]
      if (nextItem) {
        setActiveItemId(nextItem.id)
        setActiveSlideId(nextItem.slides[0]!.id)
        if (isLive) setLiveSlideId(nextItem.slides[0]!.id)
      }
    }
  }

  const handlePrev = () => {
    if (stepQuickVerse(-1)) return
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

  const updateItem = (patch: Partial<ServiceItem>) =>
    setItems(prev => prev.map(i => i.id === activeItemId ? { ...i, ...patch } : i))

  // anim = null → group follows the item's default animation again
  const updateGroupAnimation = (group: string, anim: TextAnimation | null) =>
    setItems(prev => prev.map(i => {
      if (i.id !== activeItemId) return i
      const next = { ...(i.groupAnimations ?? {}) }
      if (anim) next[group] = anim
      else delete next[group]
      return { ...i, groupAnimations: next }
    }))

  const updateSlide = (slideId: string, updates: Partial<typeof activeItem.slides[0]>) =>
    setItems(prev => prev.map(item => ({
      ...item,
      slides: item.slides.map(s => s.id === slideId ? { ...s, ...updates } : s),
    })))

  // ── Song text edits (Edit Lagu from the Library, the Urutan Ibadah or the slide grid) ──
  const itemsRef = useRef(items)
  itemsRef.current = items
  const [songEditItemId, setSongEditItemId] = useState<string | null>(null)

  /**
   * New lyrics for every copy of the song in the service (or only `onlyItemId` for a song that is not
   * in the library). Slides keep their id and per-slide settings by position, so the slide on air stays
   * on air with its new text; when the song got shorter, selection / live move to its last slide.
   */
  const applySongEdit = (edited: EditableSong, onlyItemId?: string) => {
    const matches = (i: ServiceItem) =>
      onlyItemId ? i.id === onlyItemId : edited.id != null && songIdOf(i) === edited.id
    const stamp = Date.now().toString(36)
    const prev  = itemsRef.current
    const next  = prev.map(item => {
      if (!matches(item)) return item
      const slides = edited.slides.map((s, idx) => {
        const old = item.slides[idx]
        return old
          ? { ...old, label: s.label, text: s.lyrics }
          : { id: `${item.id}_e${stamp}_${idx + 1}`, label: s.label, text: s.lyrics }
      })
      return { ...item, title: edited.title, subtitle: edited.artist, slides }
    })
    if (!next.some((item, i) => item !== prev[i])) return
    const exists   = (id: string | null) => !!id && next.some(i => i.slides.some(s => s.id === id))
    const fallback = (id: string | null) => {
      const before = prev.find(i => i.slides.some(s => s.id === id))
      return next.find(i => i.id === before?.id)?.slides.at(-1)?.id ?? null
    }
    itemsRef.current = next
    setItems(next)
    setActiveSlideId(cur => (exists(cur) ? cur : fallback(cur) ?? cur))
    setLiveSlideId(cur => (cur == null || exists(cur) ? cur : fallback(cur)))
  }

  const applySongEditRef = useRef(applySongEdit)
  applySongEditRef.current = applySongEdit
  useEffect(() => {
    const onEdited = (e: Event) => applySongEditRef.current((e as CustomEvent<EditableSong>).detail)
    window.addEventListener(SONG_EDITED, onEdited)
    return () => window.removeEventListener(SONG_EDITED, onEdited)
  }, [])

  const songEditItem = songEditItemId ? items.find(i => i.id === songEditItemId) ?? null : null

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
      background: { ...appSettings.display1.scriptureBackground },
      textStyle: defaultTextStyle(appSettings),
    }
    setItems(prev => [...prev, newItem])
    setActiveItemId(newId)
    setActiveSlideId(newItem.slides[0]!.id)
  }

  // App defaults (Settings ⚙) apply unless the song already has its own saved defaults
  const handleAddSong = (raw: ServiceItem, hasSavedSettings = false) => {
    const item = withUniqueSlideIds(hasSavedSettings ? raw : applyAppDefaults(raw, appSettings), items)
    setItems(prev => [...prev, item])
    setActiveItemId(item.id)
    setActiveSlideId(item.slides[0]!.id)
  }

  const makeMediaItem = (file: MediaFile, newId = `media_${Date.now()}`): ServiceItem => {
    const SUBTITLES: Record<MediaFile['mediaType'], string> = {
      image: 'Gambar', video: 'Video', ppt: 'PowerPoint', pdf: 'PDF', slides: 'Presentasi',
    }
    const newItem: ServiceItem = {
      id: newId,
      type: 'media',
      title: file.name,
      subtitle: file.pages ? `${SUBTITLES.slides} · ${file.pages.length} hal` : SUBTITLES[file.mediaType],
      // Presentation: one slide per page image; other media: a single slide
      slides: file.pages
        ? file.pages.map((url, i) => ({ id: `${newId}_p${i + 1}`, label: `Hal ${i + 1}`, text: '', image: url }))
        : [{ id: `${newId}_s0`, label: file.name, text: '' }],
      background: { type: 'solid', color: '#000000' },
      textStyle: { ...DEFAULT_TEXT_STYLE },
      mediaUrl: file.url,
      mediaType: file.mediaType,
    }
    return newItem
  }

  // Operator remote → Media tab: library file as a service item (reused if already added).
  // PDFs reuse the pages rendered for the Speaker, otherwise they are rendered here.
  const openLibraryMedia = async (file: string) => {
    const id = LIB_PREFIX + file
    const existing = items.find(i => i.id === id)
    if (existing) { setActiveItemId(id); setActiveSlideId(existing.slides[0]!.id); return }
    const list = await fetch('/api/media/').then(r => r.json() as Promise<{
      files?: { file: string; name: string; kind: MediaFile['mediaType']; url: string; playable?: boolean }[]
    }>)
    const m = list.files?.find(f => f.file === file)
    if (!m || m.kind === 'ppt' || m.playable === false) return
    let media: MediaFile = { id: m.file, name: m.name, url: m.url, size: 0, mediaType: m.kind }
    if (m.kind === 'pdf') {
      const deck  = speakerDecks.find(d => d.file === m.file && d.pages.length)
      const pages = deck?.pages ?? await convertPdfToSlides(
        new File([await fetch(m.url).then(r => r.blob())], m.name, { type: 'application/pdf' }))
      if (!pages.length) return
      media = { ...media, mediaType: 'slides', url: pages[0]!, pages, name: m.name.replace(/\.pdf$/i, '') }
    }
    const item = makeMediaItem(media, id)
    setItems(prev => prev.some(i => i.id === id) ? prev : [...prev, item])
    setActiveItemId(id)
    setActiveSlideId(item.slides[0]!.id)
  }

  const handleAddMedia = (file: MediaFile) => {
    const newItem = makeMediaItem(file)
    setItems(prev => [...prev, newItem])
    setActiveItemId(newItem.id)
    setActiveSlideId(newItem.slides[0]!.id)
  }

  const handleQuickLaunch = (text: string, label: string, version = 'TB') => {
    setQuickSlide({ text, label, version })
    setIsLive(true)
    setIsBlank(false)
    setIsClearText(false)   // a new verse always shows its text
    // Also show in CenterPanel (monitor view): add/replace a single reusable Quick item
    const qSlide = { id: '__qs__', label, text }
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === '__quick__')
      const old = idx >= 0 ? prev[idx] : undefined
      // Keep the operator's background / text style / playlist across quick verses
      const qItem: ServiceItem = {
        id: '__quick__',
        type: 'scripture',
        title: label,
        subtitle: 'Quick',
        slides: [qSlide],
        background: old?.background ?? { ...appSettings.display1.scriptureBackground },
        textStyle:  old?.textStyle  ?? defaultTextStyle(appSettings),
        bgPlaylist: old?.bgPlaylist,
        activeBgId: old?.activeBgId,
      }
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
    const idx = items.findIndex(i => i.id === id)
    if (idx < 0) return
    const newItems = items.filter(i => i.id !== id)
    setItems(newItems)
    if (id === activeItem.id) {
      const next = newItems[Math.min(idx, newItems.length - 1)]
      setActiveItemId(next?.id ?? '')
      setActiveSlideId(next?.slides[0]?.id ?? '')
    }
    // Removing what is on air takes it off air
    if (id === liveItem?.id || (id === '__quick__' && quickSlide)) {
      setIsLive(false)
      setLiveSlideId(null)
      setQuickSlide(null)
    }
  }

  const handleLoadScene = (loadedItems: ServiceItem[], scene: SceneRef) => {
    if (!loadedItems.length) return
    setCurrentScene(scene)
    // Scenes saved before slide ids were unique per item may hold the same song twice
    const normalized: ServiceItem[] = []
    for (const item of loadedItems.filter(i => i.id !== '__quick__')) {
      normalized.push(withUniqueSlideIds({
        ...item,
        background: item.background ?? (item.type === 'song' ? DEFAULT_SONG_BG : DEFAULT_SCRIPTURE_BG),
        textStyle: item.textStyle ?? DEFAULT_TEXT_STYLE,
      }, normalized))
    }
    setItems(normalized)
    const first = normalized[0] ?? loadedItems[0]!
    setActiveItemId(first.id)
    setActiveSlideId(first.slides[0]?.id ?? '')
    setLiveSlideId(null)
    setIsLive(false)
    setQuickSlide(null)
  }

  // ── Phone remote (Operator / Speaker) — snapshot out, commands in ──

  const scriptureText = (type: ServiceItem['type'], s: Slide) =>
    type === 'scripture' && appSettings.scripture.showReference && s.label && s.text ? `${s.label}\n“${s.text}”` : s.text

  const remoteNext = ((): RemoteSnapshot['next'] => {
    if (quickSlide || isEmpty) return null
    if (!isLive) return { label: activeSlide.label, text: scriptureText(activeItem.type, activeSlide) || activeItem.title }
    const base = liveItem ?? activeItem
    const idx  = base.slides.findIndex(s => s.id === liveSlideId)
    const nextInItem = base.slides[idx + 1]
    const nextItem   = nextInItem ? base : items[items.findIndex(i => i.id === base.id) + 1]
    const slide      = nextInItem ?? nextItem?.slides[0]
    return slide && nextItem ? { label: slide.label || nextItem.title, text: scriptureText(nextItem.type, slide) || nextItem.title } : null
  })()

  const remoteSnapshot: RemoteSnapshot = {
    isLive, isBlank, isClear: isClearText,
    live: rawLiveSlide ? {
      title: quickSlide ? quickSlide.label : (liveItem ?? activeItem).title,
      label: quickSlide ? '' : rawLiveSlide.label,
      text: withReference(rawLiveSlide).text || (liveItem ?? activeItem).title,
    } : null,
    next: remoteNext,
    items: items.map(i => ({ id: i.id, title: i.title, subtitle: i.subtitle, kind: ITEM_KIND[i.type] })),
    activeItemId: isEmpty ? '' : activeItem.id,
    activeTitle: activeItem.title,
    liveItemId: liveItem?.id ?? null,
    slides: isEmpty ? [] : activeItem.slides.map(s => ({ id: s.id, label: s.label, text: s.text, image: s.image })),
    activeSlideId: activeSlide.id,
    liveSlideId,
    runningText: runningText?.text ?? null,
    decks: speakerDecks
      .filter(d => d.kind !== 'pdf' || d.pages.length)   // a PDF waits until its pages are rendered
      .map(d => ({ id: d.file, name: d.name, kind: d.kind, pages: d.pages.length ? d.pages : [d.url] })),
    liveDeck: isLive && liveItem?.id.startsWith(DECK_PREFIX)
      ? { id: liveItem.id.slice(DECK_PREFIX.length), page: Math.max(0, liveItem.slides.findIndex(s => s.id === liveSlideId)) }
      : null,
    liveImage: isLive && !isBlank ? (rawLiveSlide?.image ?? (liveMediaType === 'image' ? liveMediaUrl ?? null : null)) : null,
    textAnim: isEmpty || activeItem.type === 'media' ? null : {
      presets: TEXT_ANIM_PRESETS.map(p => p.name),
      current: presetNameOf(activeItem.textStyle.animation),
    },
    bgPlaylist: isEmpty || activeItem.type === 'media' ? null : {
      entries: (activeItem.bgPlaylist ?? []).map(remoteBg),
      activeId: activeItem.activeBgId ?? null,
    },
  }
  const remoteJson = JSON.stringify(remoteSnapshot)
  useEffect(() => { window.electronAPI?.remoteSendState?.(remoteJson) }, [remoteJson])

  // Commands arrive asynchronously — always run them against the latest handlers / state
  const remoteCommand = useRef<(cmd: RemoteCommand) => void>(() => {})
  remoteCommand.current = (cmd: RemoteCommand) => {
    switch (cmd.type) {
      case 'prev':  handlePrev(); break
      case 'next':  handleNext(); break
      case 'live':  handleGoLive(); break
      case 'blank': handleBlank(); break
      case 'clear': handleClearText(); break
      case 'selectItem': {
        const item = items.find(i => i.id === cmd.id)
        if (item) { setActiveItemId(item.id); setActiveSlideId(item.slides[0]?.id ?? '') }
        break
      }
      case 'deck': {
        // Marked file → its own service item (added once), that page on air
        const deck = speakerDecks.find(d => d.file === cmd.id)
        if (!deck) break
        const id   = DECK_PREFIX + deck.file
        const item = items.find(i => i.id === id) ?? makeMediaItem(deckToMedia(deck), id)
        if (!items.some(i => i.id === id)) setItems(prev => [...prev, item])
        const slide = item.slides[cmd.page] ?? item.slides[0]!
        setActiveItemId(id)
        handleGoLiveSlide(slide.id)
        break
      }
      case 'deckStep': {
        // Only moves a Speaker presentation that is on air — never songs / verses
        if (!isLive || !liveItem?.id.startsWith(DECK_PREFIX)) break
        const idx  = liveItem.slides.findIndex(s => s.id === liveSlideId)
        const next = liveItem.slides[idx + cmd.delta]
        if (next) { setActiveItemId(liveItem.id); handleGoLiveSlide(next.id) }
        break
      }
      case 'media':
        void openLibraryMedia(cmd.file).catch(() => {})
        break
      case 'quick':
        if (cmd.text && cmd.label) handleQuickLaunch(cmd.text, cmd.label, cmd.version)
        break
      case 'liveSlide': {
        const item = items.find(i => i.id === cmd.itemId)
        if (item?.slides.some(s => s.id === cmd.slideId)) { setActiveItemId(item.id); handleGoLiveSlide(cmd.slideId) }
        break
      }
      case 'textAnim': {
        // Same as a preset button in Animasi Teks with "Semua slide" — on the selected item
        if (isEmpty || activeItem.type === 'media') break
        const current = activeItem.textStyle.animation ?? DEFAULT_TEXT_ANIMATION
        if (cmd.preset === 'none') { updateTextStyle({ animation: { ...DEFAULT_TEXT_ANIMATION } }); break }
        const preset = TEXT_ANIM_PRESETS.find(p => p.name === cmd.preset)
        if (preset) updateTextStyle({ animation: presetAnimation(preset.anim, current) })
        break
      }
      case 'bg': {
        // Same as clicking a tile in Background Playlist (live when the item is on air)
        if (isEmpty || activeItem.type === 'media') break
        if (cmd.id === null || activeItem.bgPlaylist?.some(e => e.id === cmd.id)) updateItem({ activeBgId: cmd.id ?? undefined })
        break
      }
    }
  }
  useEffect(() => window.electronAPI?.onRemoteCommand?.(cmd => remoteCommand.current(cmd as RemoteCommand)), [])
  useEffect(() => window.electronAPI?.onRemoteClients?.(setRemoteClients), [])

  const editingSlide = editSlideId
    ? items.flatMap(i => i.slides).find(s => s.id === editSlideId) ?? null
    : null
  const editingItem = editSlideId
    ? items.find(i => i.slides.some(s => s.id === editSlideId)) ?? activeItem
    : activeItem

  return (
    <div className="flex flex-col select-none"
      style={{ background: '#0f1117', color: '#f1f5f9', zoom: ui.zoom, height: `${100 / ui.zoom}vh` }}>
      <TopBar
        isLive={isLive}
        isBlank={isBlank}
        onGoLive={handleGoLive}
        onBlank={handleBlank}
        service={items}
        onQuickLaunch={handleQuickLaunch}
        onGotoItem={handleGotoItem}
        onOpenSettings={() => setShowSettings(true)}
        onOpenRemote={() => setShowRemote(true)}
        remoteCount={remoteClients.operator + remoteClients.speaker}
        wall={{
          visible: appSettings.wall.matrix.control !== 'off',
          on: wallOn,
          busy: wallBusy,
          onToggle: async () => {
            const next = !wallOn
            setWallBusy(true)
            try {
              const r = await switchWall(appSettings.wall.matrix, next)
              // Manual: the operator presses the matrix buttons, so the reminder stays until dismissed
              setWallMsg({ ok: r.ok, text: r.message, sticky: appSettings.wall.matrix.control === 'manual' || !r.ok })
              if (r.ok) setWallOn(next)
            } finally {
              setWallBusy(false)
            }
          },
        }}
      />

      <SecondScreenNotice enabled={appSettings.output.display1.enabled} />

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
          onEditSong={setSongEditItemId}
          onAddScripture={handleAddScripture}
          onAddSong={handleAddSong}
          onAddMedia={handleAddMedia}
          onQuickLaunch={handleQuickLaunch}
          onLoadScene={handleLoadScene}
          currentScene={currentScene}
          onSceneSaved={setCurrentScene}
        />

        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 min-w-0 text-center px-6"
            style={{ background: '#0f1117' }}>
            <div className="text-sm font-medium" style={{ color: '#94a3b8' }}>Urutan Ibadah masih kosong</div>
            <div className="text-xs" style={{ color: '#475569' }}>
              Tambahkan lagu, ayat, atau media dari Pustaka di kiri — atau buka Scene yang sudah disimpan.
            </div>
          </div>
        ) : (
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
          onEditSong={() => setSongEditItemId(activeItem.id)}
          onUpdateSlide={updateSlide}
          bgLibrary={bgLibrary}
          onUpdateItem={updateItem}
          onUpdateTextStyle={updateTextStyle}
          onUpdateGroupAnimation={updateGroupAnimation}
          mediaControl={mediaControl}
          mediaStatus={mediaStatus}
          onMediaControl={updateMediaControl}
        />
        )}

        <RightPanel
          isEmpty={isEmpty}
          runningText={runningText}
          onRunningText={setRunningText}
          chromaKey={chromaColor(out1)}
          keyLive={chromaColor(out1) != null && chromaApplies(out1.chromaFor, outputState.itemType)}
          subtitle={out1.subtitle}
          subtitleSize={out1.subtitleSize}
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
          mediaControl={mediaControl}
          onMediaStatus={handleMediaStatus}
          onUpdateBackground={updateBackground}
          onUpdateTextStyle={updateTextStyle}
        />
      </div>

      <StatusBar
        item={activeItem}
        slide={quickSlide ? { id: '__qs__', label: quickSlide.label, text: quickSlide.text } : activeSlide}
        liveSlideId={quickSlide ? '__quick__' : liveSlideId}
        isLive={isLive}
        remotes={remoteClients}
        onOpenRemote={() => setShowRemote(true)}
      />

      {scaleToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-semibold pointer-events-none"
          style={{ background: 'rgba(15,17,23,0.92)', border: '1px solid #2a3347', color: '#e2e8f0', zIndex: 100 }}>
          Ukuran tampilan {Math.round(ui.zoom * 100)}%{ui.mode === 'auto' ? ' (otomatis)' : ''}
          <span style={{ color: '#64748b' }}> · Ctrl + / − · Ctrl 0 = otomatis</span>
        </div>
      )}

      {wallMsg && (
        <button onClick={() => setWallMsg(null)}
          className="fixed top-16 right-4 max-w-md px-3 py-2 rounded-lg text-xs font-semibold text-left"
          style={{
            background: wallMsg.ok ? 'rgba(6,78,59,0.95)' : 'rgba(127,29,29,0.95)',
            border: `1px solid ${wallMsg.ok ? '#059669' : '#dc2626'}`, color: '#f8fafc', zIndex: 100,
          }}>
          🧱 {wallMsg.text}
          {wallMsg.sticky && <span className="block text-[10px] font-normal mt-0.5" style={{ color: '#cbd5e1' }}>Klik untuk menutup</span>}
        </button>
      )}

      {showRemote && <RemoteModal clients={remoteClients} onClose={() => setShowRemote(false)} />}

      {showSettings && (
        <SettingsModal
          settings={appSettings}
          bgLibrary={bgLibrary}
          currentScene={currentScene}
          onSave={saveAppSettings}
          onCreateScene={handleCreateScene}
          onClose={() => setShowSettings(false)}
        />
      )}

      {editingSlide && (
        <SlideEditModal
          slide={editingSlide}
          item={editingItem}
          onSave={updateSlide}
          onClose={() => setEditSlideId(null)}
        />
      )}

      {songEditItem && (
        <AddSongModal
          song={{
            id: songIdOf(songEditItem),
            title: songEditItem.title,
            artist: songEditItem.subtitle,
            slides: songEditItem.slides.map(s => ({ label: s.label, lyrics: s.text })),
          }}
          // Library songs reach every copy through SONG_EDITED; a service-only song changes just this item
          onSaved={edited => { if (edited.id == null) applySongEdit(edited, songEditItem.id) }}
          onClose={() => setSongEditItemId(null)}
        />
      )}
    </div>
  )
}
