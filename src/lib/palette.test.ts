import { describe, expect, it } from 'vitest'
import { rankLinks } from './palette'

const links = [
  { label: 'GitHub', url: 'https://github.com/' },
  { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
  { label: 'Hacker News', url: 'https://news.ycombinator.com/' },
]

describe('rankLinks', () => {
  it('lists the first links for an empty query', () => {
    expect(rankLinks(links, '')).toEqual(links)
    expect(rankLinks(links, '   ', 2)).toHaveLength(2)
  })

  it('ranks label prefix, then label substring, then url matches', () => {
    expect(rankLinks(links, 'git')[0].label).toBe('GitHub')
    expect(rankLinks(links, 'web')[0].label).toBe('MDN Web Docs')
    expect(rankLinks(links, 'ycombinator')[0].label).toBe('Hacker News')
  })

  it('returns nothing when there is no match', () => {
    expect(rankLinks(links, 'zzz')).toEqual([])
  })

  it('applies the limit', () => {
    expect(rankLinks(links, '', 1)).toHaveLength(1)
    expect(rankLinks(links, 'a', 1)).toHaveLength(1)
  })
})
