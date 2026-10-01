import { describe, expect, it } from 'vitest'
import { buildSearchUrl, looksLikeUrl, toUrl } from './search'

describe('buildSearchUrl', () => {
  it('builds a DuckDuckGo URL by default', () => {
    expect(buildSearchUrl('ddg', 'solid js')).toBe(
      'https://duckduckgo.com/?q=solid%20js',
    )
  })

  it('builds a DuckDuckGo No-AI URL', () => {
    expect(buildSearchUrl('ddg-noai', 'solid js')).toBe(
      'https://noai.duckduckgo.com/?q=solid%20js',
    )
  })

  it('encodes special characters', () => {
    expect(buildSearchUrl('ddg', 'a&b=c')).toBe(
      'https://duckduckgo.com/?q=a%26b%3Dc',
    )
  })

  it('passes bangs through as part of the query', () => {
    expect(buildSearchUrl('ddg', '!w brutalist web design')).toBe(
      'https://duckduckgo.com/?q=!w%20brutalist%20web%20design',
    )
  })

  it('returns null for blank input', () => {
    expect(buildSearchUrl('ddg', '   ')).toBeNull()
  })
})

describe('looksLikeUrl / toUrl', () => {
  it('detects bare domains', () => {
    expect(looksLikeUrl('example.com')).toBe(true)
    expect(toUrl('example.com')).toBe('https://example.com')
    expect(toUrl('example.com/path?q=1')).toBe('https://example.com/path?q=1')
  })

  it('detects explicit schemes', () => {
    expect(looksLikeUrl('https://example.com')).toBe(true)
    expect(toUrl('https://example.com')).toBe('https://example.com')
    expect(toUrl('http://localhost:3000')).toBe('http://localhost:3000')
  })

  it('detects localhost with a port', () => {
    expect(looksLikeUrl('localhost:5173')).toBe(true)
    expect(toUrl('localhost:5173')).toBe('https://localhost:5173')
  })

  it('detects a scheme and a bare localhost', () => {
    expect(looksLikeUrl('ssh://host')).toBe(true)
    expect(toUrl('localhost')).toBe('https://localhost')
  })

  it('treats multi-word and bang input as queries', () => {
    expect(looksLikeUrl('hello world')).toBe(false)
    expect(toUrl('hello world')).toBeNull()
    expect(toUrl('!w brutalist')).toBeNull()
  })

  it('rejects empty input', () => {
    expect(looksLikeUrl('')).toBe(false)
    expect(toUrl('   ')).toBeNull()
  })
})
