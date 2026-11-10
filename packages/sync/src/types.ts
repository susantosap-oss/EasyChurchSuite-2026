export type SyncEventType =
  | 'slide:next'
  | 'slide:prev'
  | 'slide:goto'
  | 'slide:blank'
  | 'slide:show'
  | 'song:load'
  | 'scripture:load'
  | 'playlist:load'
  | 'playlist:item'
  | 'display:message'
  | 'display:clear'
  | 'client:connected'
  | 'client:disconnected'
  | 'server:state'
  | 'ping'
  | 'pong'

export interface SyncMessage {
  type: SyncEventType
  payload?: unknown
  timestamp: number
  clientId?: string
}

export interface ServerState {
  currentPlaylistId: number | null
  currentItemIndex: number
  currentSlideIndex: number
  isBlank: boolean
  connectedClients: number
}

export interface SlideGotoPayload {
  itemIndex: number
  slideIndex: number
}

export interface SongLoadPayload {
  songId: number
  title: string
  totalSlides: number
}

export interface ScriptureLoadPayload {
  reference: string
  verseId: number
  text: string
}
