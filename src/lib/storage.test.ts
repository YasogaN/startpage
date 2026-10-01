// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, STORAGE_KEY } from '../config/defaults'
import {
  exportSettings,
  loadSettings,
  parseImport,
  sanitizeSettings,
  saveSettings,
} from './storage'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('sanitizeSettings', () => {
  it('falls back to defaults for non-objects', () => {
    const settings = sanitizeSettings('nonsense')
    expect(settings.engine).toBe('ddg')
    expect(settings.theme).toBe('dark')
    expect(settings.groups.length).toBeGreaterThan(0)
  })

  it('keeps valid theme and engine', () => {
    const settings = sanitizeSettings({
      theme: 'light',
      engine: 'ddg-noai',
      groups: [],
    })
    expect(settings.theme).toBe('light')
    expect(settings.engine).toBe('ddg-noai')
  })

  it('accepts the system theme', () => {
    expect(sanitizeSettings({ theme: 'system' }).theme).toBe('system')
  })

  it('rejects unknown engines and themes', () => {
    const settings = sanitizeSettings({ theme: 'neon', engine: 'google' })
    expect(settings.theme).toBe('dark')
    expect(settings.engine).toBe('ddg')
  })

  it('sanitizes the display and suggestion toggles', () => {
    expect(sanitizeSettings({ favicons: false }).favicons).toBe(false)
    expect(sanitizeSettings({ favicons: 'nope' }).favicons).toBe(true)
    expect(sanitizeSettings({ suggestions: true }).suggestions).toBe(true)
    expect(sanitizeSettings({ suggestions: 1 }).suggestions).toBe(false)
  })

  it('sanitizes the time settings', () => {
    expect(sanitizeSettings({ syncTime: false }).syncTime).toBe(false)
    expect(sanitizeSettings({ syncTime: 'nope' }).syncTime).toBe(true)
    expect(sanitizeSettings({ timeZone: 'Europe/London' }).timeZone).toBe(
      'Europe/London',
    )
    expect(sanitizeSettings({ timeZone: 'Not/AZone' }).timeZone).toBe('')
    expect(sanitizeSettings({ timeZone: '' }).timeZone).toBe('')
    expect(sanitizeSettings({ timeZone: 5 }).timeZone).toBe('')
  })

  it('drops malformed links and groups', () => {
    const settings = sanitizeSettings({
      groups: [
        { title: 'Good', links: [{ label: 'A', url: 'https://a.test' }] },
        {
          title: 'Bad',
          links: [
            { label: '', url: '' },
            'garbage',
            { url: 'x' },
            { label: 'C', url: 5 },
          ],
        },
        'not a group',
      ],
    })
    expect(settings.groups).toHaveLength(2)
    expect(settings.groups[0].links).toHaveLength(1)
    expect(settings.groups[1].links).toHaveLength(0)
  })

  it('names untitled groups and skips empty ones', () => {
    const settings = sanitizeSettings({
      groups: [
        { links: [{ label: 'A', url: 'https://a.test' }] },
        { title: 'Only a title' },
        { title: '', links: [] },
        { title: '  Spaced  ', links: [{ label: ' B ', url: ' c ' }] },
      ],
    })
    expect(settings.groups.map((group) => group.title)).toEqual([
      'Untitled',
      'Spaced',
    ])
    expect(settings.groups[1].links).toEqual([{ label: 'B', url: 'c' }])
  })
})

describe('parseImport', () => {
  it('returns null for invalid JSON', () => {
    expect(parseImport('{ not json')).toBeNull()
  })

  it('sanitizes valid JSON', () => {
    const parsed = parseImport(JSON.stringify({ theme: 'light', groups: [] }))
    expect(parsed?.theme).toBe('light')
  })
})

describe('persistence', () => {
  it('returns defaults when storage is empty', () => {
    expect(loadSettings().engine).toBe('ddg')
  })

  it('loads persisted settings', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ engine: 'ddg-noai', theme: 'light' }),
    )
    const settings = loadSettings()
    expect(settings.engine).toBe('ddg-noai')
    expect(settings.theme).toBe('light')
  })

  it('falls back when stored JSON is invalid', () => {
    localStorage.setItem(STORAGE_KEY, '{ broken')
    expect(loadSettings().theme).toBe('dark')
  })

  it('saves and re-loads settings', () => {
    saveSettings({ ...DEFAULT_SETTINGS, theme: 'light' })
    expect(loadSettings().theme).toBe('light')
  })

  it('ignores save failures', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow()
  })
})

describe('exportSettings', () => {
  it('pretty-prints settings as JSON', () => {
    const text = exportSettings(DEFAULT_SETTINGS)
    expect(text).toContain('\n')
    expect(JSON.parse(text).engine).toBe('ddg')
  })
})
