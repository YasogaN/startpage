import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DARK_QUERY,
  ambientMatchMedia,
  resolveTheme,
  subscribeSystemTheme,
  systemPrefersDark,
} from './theme'
import type { MediaQueryLike } from './theme'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ambientMatchMedia', () => {
  it('returns undefined without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(ambientMatchMedia()).toBeUndefined()
  })

  it('binds matchMedia when present', () => {
    const impl = vi.fn(() => ({ matches: true }))
    vi.stubGlobal('matchMedia', impl)
    const bound = ambientMatchMedia()
    bound!(DARK_QUERY)
    expect(impl).toHaveBeenCalledWith(DARK_QUERY)
  })
})

describe('systemPrefersDark', () => {
  it('defaults to dark without matchMedia', () => {
    expect(systemPrefersDark(undefined)).toBe(true)
  })

  it('reads the media query', () => {
    expect(systemPrefersDark(() => ({ matches: true }))).toBe(true)
    expect(systemPrefersDark(() => ({ matches: false }))).toBe(false)
  })

  it('defaults to dark when matchMedia throws', () => {
    expect(
      systemPrefersDark(() => {
        throw new Error('boom')
      }),
    ).toBe(true)
  })
})

describe('resolveTheme', () => {
  it('passes explicit modes through', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('resolves system mode from the preference', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})

describe('subscribeSystemTheme', () => {
  it('is a no-op without matchMedia', () => {
    const unsubscribe = subscribeSystemTheme(undefined, vi.fn())
    expect(() => unsubscribe()).not.toThrow()
  })

  it('is a no-op when matchMedia throws', () => {
    const unsubscribe = subscribeSystemTheme(() => {
      throw new Error('boom')
    }, vi.fn())
    expect(() => unsubscribe()).not.toThrow()
  })

  it('uses addEventListener when available', () => {
    const listener = vi.fn()
    const removeEventListener = vi.fn()
    let handler: ((event: { matches: boolean }) => void) | undefined
    const query: MediaQueryLike = {
      matches: false,
      addEventListener: (_type, next) => {
        handler = next
      },
      removeEventListener,
    }

    const unsubscribe = subscribeSystemTheme(() => query, listener)
    handler!({ matches: true })
    expect(listener).toHaveBeenCalledWith(true)

    unsubscribe()
    expect(removeEventListener).toHaveBeenCalledWith('change', handler)
  })

  it('tolerates a missing removeEventListener', () => {
    const query: MediaQueryLike = { matches: false, addEventListener: () => {} }
    const unsubscribe = subscribeSystemTheme(() => query, vi.fn())
    expect(() => unsubscribe()).not.toThrow()
  })

  it('falls back to the legacy addListener API', () => {
    const listener = vi.fn()
    const removeListener = vi.fn()
    let handler: ((event: { matches: boolean }) => void) | undefined
    const query: MediaQueryLike = {
      matches: false,
      addListener: (next) => {
        handler = next
      },
      removeListener,
    }

    const unsubscribe = subscribeSystemTheme(() => query, listener)
    handler!({ matches: false })
    expect(listener).toHaveBeenCalledWith(false)

    unsubscribe()
    expect(removeListener).toHaveBeenCalledWith(handler)
  })

  it('tolerates a missing removeListener', () => {
    const query: MediaQueryLike = { matches: false, addListener: () => {} }
    const unsubscribe = subscribeSystemTheme(() => query, vi.fn())
    expect(() => unsubscribe()).not.toThrow()
  })

  it('is a no-op for a query with no subscription API', () => {
    const unsubscribe = subscribeSystemTheme(() => ({ matches: false }), vi.fn())
    expect(() => unsubscribe()).not.toThrow()
  })
})
