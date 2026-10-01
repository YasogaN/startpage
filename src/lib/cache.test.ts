import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearFaviconCache } from './cache'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('clearFaviconCache', () => {
  it('returns false without the Cache API', async () => {
    vi.stubGlobal('caches', undefined)
    expect(await clearFaviconCache()).toBe(false)
  })

  it('deletes the favicon cache', async () => {
    const store = { delete: vi.fn(async () => true) }
    expect(await clearFaviconCache(store)).toBe(true)
    expect(store.delete).toHaveBeenCalledWith('favicons')
  })

  it('tolerates deletion failures', async () => {
    const store = {
      delete: async () => {
        throw new Error('no cache access')
      },
    }
    expect(await clearFaviconCache(store)).toBe(false)
  })
})
