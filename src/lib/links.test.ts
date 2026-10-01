import { describe, expect, it } from 'vitest'
import { faviconUrl, hostnameOf, monogram } from './links'

describe('monogram', () => {
  it('uses the first alphanumeric character', () => {
    expect(monogram('GitHub')).toBe('G')
    expect(monogram('  example')).toBe('E')
    expect(monogram('7zip')).toBe('7')
  })

  it('falls back for labels without alphanumerics', () => {
    expect(monogram('!!!')).toBe('?')
  })
})

describe('hostnameOf', () => {
  it('returns the bare hostname', () => {
    expect(hostnameOf('https://www.youtube.com/watch')).toBe('youtube.com')
    expect(hostnameOf('https://github.com/')).toBe('github.com')
  })

  it('returns the raw value for invalid URLs', () => {
    expect(hostnameOf('not-a-url')).toBe('not-a-url')
  })
})

describe('faviconUrl', () => {
  it('builds a DuckDuckGo icon URL', () => {
    expect(faviconUrl('https://www.github.com/x')).toBe(
      'https://icons.duckduckgo.com/ip3/github.com.ico',
    )
  })

  it('returns null for invalid URLs', () => {
    expect(faviconUrl('nope')).toBeNull()
  })

  it('returns null when there is no hostname', () => {
    expect(faviconUrl('file:///tmp/x')).toBeNull()
  })
})
