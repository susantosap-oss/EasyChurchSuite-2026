// Server-only: read the app settings document (Settings ⚙) from app_settings
import { getPresenterDb } from './db.server'
import { normalizeSettings, type AppSettings } from '@/components/settings/appSettings'

export function getServerSettings(): AppSettings {
  try {
    const db  = getPresenterDb() as unknown as import('better-sqlite3').Database
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'presenter.settings'").get() as { value: string } | undefined
    return normalizeSettings(row ? JSON.parse(row.value) : null)
  } catch {
    return normalizeSettings(null)
  }
}
