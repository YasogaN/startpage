import {
  DEFAULT_SETTINGS,
  ENGINES,
  SCHEMA_VERSION,
  STORAGE_KEY,
} from '../config/defaults'
import type { EngineId, LinkGroup, Settings, ThemeMode } from '../types'
import { isValidTimeZone } from './time'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function cloneDefaults(): Settings {
  return structuredClone(DEFAULT_SETTINGS)
}

function sanitizeGroup(raw: unknown): LinkGroup | null {
  if (!isRecord(raw) || !Array.isArray(raw.links)) return null

  const links = raw.links.flatMap((entry) => {
    if (!isRecord(entry)) return []
    const label = typeof entry.label === 'string' ? entry.label.trim() : ''
    const url = typeof entry.url === 'string' ? entry.url.trim() : ''
    return label && url ? [{ label, url }] : []
  })

  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!title && links.length === 0) return null
  return { title: title || 'Untitled', links }
}

/**
 * Coerce arbitrary parsed JSON into a valid Settings object, falling back to
 * defaults for anything missing or malformed. Used for both localStorage load
 * and user-supplied import files.
 */
export function sanitizeSettings(raw: unknown): Settings {
  const base = cloneDefaults()
  if (!isRecord(raw)) return base

  if (raw.theme === 'dark' || raw.theme === 'light' || raw.theme === 'system') {
    base.theme = raw.theme satisfies ThemeMode
  }
  if (typeof raw.engine === 'string' && raw.engine in ENGINES) {
    base.engine = raw.engine as EngineId
  }
  if (typeof raw.syncTime === 'boolean') {
    base.syncTime = raw.syncTime
  }
  if (typeof raw.favicons === 'boolean') {
    base.favicons = raw.favicons
  }
  if (typeof raw.suggestions === 'boolean') {
    base.suggestions = raw.suggestions
  }
  if (raw.timeZone === '') {
    base.timeZone = ''
  } else if (typeof raw.timeZone === 'string' && isValidTimeZone(raw.timeZone)) {
    base.timeZone = raw.timeZone
  }
  if (Array.isArray(raw.groups)) {
    base.groups = raw.groups
      .map(sanitizeGroup)
      .filter((group): group is LinkGroup => group !== null)
  }
  base.version = SCHEMA_VERSION
  return base
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return cloneDefaults()
    return sanitizeSettings(JSON.parse(raw))
  } catch {
    return cloneDefaults()
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable (private mode, quota) — the app still works in-memory.
  }
}

export function exportSettings(settings: Settings): string {
  return JSON.stringify(settings, null, 2)
}

/** Returns sanitized settings, or `null` if the text is not valid JSON. */
export function parseImport(text: string): Settings | null {
  try {
    return sanitizeSettings(JSON.parse(text))
  } catch {
    return null
  }
}
