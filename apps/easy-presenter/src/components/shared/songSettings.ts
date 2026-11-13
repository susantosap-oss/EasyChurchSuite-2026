import type { ServiceItem, SongSettings } from '../types'
import { songIdOf, songSettingsOf } from '../types'

/** Save an item's presenter settings as the default for its song in the database */
export async function saveSongSettings(item: ServiceItem): Promise<void> {
  const id = songIdOf(item)
  if (!id) throw new Error('Lagu ini belum ada di database')
  const res = await fetch(`/api/songs/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: songSettingsOf(item) }),
  })
  const data = await res.json() as { error?: string }
  if (!res.ok || data.error) throw new Error(data.error ?? 'Gagal menyimpan setting lagu')
  // Let the song library refresh its cached defaults
  window.dispatchEvent(new CustomEvent<SongSettingsSavedDetail>(SONG_SETTINGS_SAVED, {
    detail: { songId: id, settings: songSettingsOf(item) },
  }))
}

export const SONG_SETTINGS_SAVED = 'easychurch:song-settings-saved'
export interface SongSettingsSavedDetail { songId: number; settings: SongSettings }

/** Save settings of every DB song in a service; returns how many were saved */
export async function saveAllSongSettings(items: ServiceItem[]): Promise<number> {
  // The last occurrence wins when a song appears twice in the service
  const bySong = new Map<number, ServiceItem>()
  for (const item of items) {
    const id = songIdOf(item)
    if (id) bySong.set(id, item)
  }
  await Promise.all(Array.from(bySong.values()).map(saveSongSettings))
  return bySong.size
}

/** Apply saved song defaults to a freshly created service item */
export function applySongSettings(item: ServiceItem, settings: SongSettings | null | undefined): ServiceItem {
  if (!settings) return item
  return {
    ...item,
    background:      settings.background ?? item.background,
    textStyle:       settings.textStyle ? { ...item.textStyle, ...settings.textStyle } : item.textStyle,
    groupAnimations: settings.groupAnimations,
    bgPlaylist:      settings.bgPlaylist,
    activeBgId:      settings.activeBgId,
  }
}
