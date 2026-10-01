import { describe, expect, it } from 'vitest'
import { localSuggestions } from './suggest'

const links = [
  { label: 'GitHub', url: 'https://github.com/' },
  { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
]

describe('localSuggestions', () => {
  it('returns nothing for blank queries', () => {
    expect(localSuggestions('', ['x'], links)).toEqual([])
  })

  it('matches saved links by label or url', () => {
    expect(localSuggestions('git', [], links)).toEqual([
      { label: 'GitHub', url: 'https://github.com/' },
    ])
    expect(localSuggestions('mozilla', [], links)).toEqual([
      { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
    ])
  })

  it('matches recent searches', () => {
    expect(localSuggestions('brut', ['brutalist architecture'], links)).toEqual([
      { label: 'brutalist architecture' },
    ])
  })

  it('dedupes link labels and applies the limit', () => {
    const duplicated = [
      ...links,
      { label: 'GitHub', url: 'https://github.com/other' },
    ]
    expect(localSuggestions('git', [], duplicated)).toEqual([
      { label: 'GitHub', url: 'https://github.com/' },
    ])

    const many = Array.from({ length: 10 }, (_, index) => ({
      label: `site${index}`,
      url: `https://s${index}.test/`,
    }))
    expect(localSuggestions('site', [], many, 3)).toHaveLength(3)
  })

  it('keeps links ahead of recent searches', () => {
    const result = localSuggestions('git', ['GitHub tips'], links)
    expect(result[0]).toEqual({ label: 'GitHub', url: 'https://github.com/' })
    expect(result[1]).toEqual({ label: 'GitHub tips' })
  })
})
