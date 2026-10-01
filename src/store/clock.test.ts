// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

const CACHE_KEY = 'startpage.time.v1'
const MAX = 60 * 60 * 1000

const response = (body: string, ok = true) =>
  ({ ok, text: async () => body }) as unknown as Response

/** Re-import the module so `readCache()` runs against the seeded storage. */
async function load(cache?: string | null) {
  vi.resetModules()
  localStorage.clear()
  if (cache !== undefined && cache !== null) {
    localStorage.setItem(CACHE_KEY, cache)
  }
  return (await import('./clock')).clock
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  localStorage.clear()
})

describe('cache hydration', () => {
  it('starts from local time when there is no cache', async () => {
    const clock = await load()
    expect(clock.offsetMs()).toBe(0)
    expect(clock.source()).toBe('local')
    expect(clock.syncedAt()).toBe(0)
    expect(clock.syncing()).toBe(false)
  })

  it('hydrates a valid cache', async () => {
    const clock = await load(
      JSON.stringify({ offsetMs: 1234, source: 'cloudflare', syncedAt: 50 }),
    )
    expect(clock.offsetMs()).toBe(1234)
    expect(clock.source()).toBe('cloudflare')
    expect(clock.syncedAt()).toBe(50)
  })

  it('defaults a missing source label', async () => {
    const clock = await load(JSON.stringify({ offsetMs: 1, syncedAt: 2 }))
    expect(clock.source()).toBe('cached')
  })

  it('ignores invalid cache JSON', async () => {
    const clock = await load('{ not json')
    expect(clock.offsetMs()).toBe(0)
  })

  it('ignores an incomplete cache', async () => {
    const clock = await load(JSON.stringify({ offsetMs: 1 }))
    expect(clock.offsetMs()).toBe(0)
  })
})

describe('sync', () => {
  it('applies a network offset and reports the source', async () => {
    const clock = await load()
    clock.configure({ now: () => 1000, fetchImpl: async () => response('ts=2000.000') })

    expect(await clock.sync(true)).toBe(true)
    // Sample 2_000_000ms against a local 1000ms -> offset 1_999_000ms.
    expect(clock.offsetMs()).toBe(1_999_000)
    expect(clock.source()).toBe('cloudflare')
    expect(clock.syncedAt()).toBe(1000)
    expect(clock.now()).toBe(2_000_000)
  })

  it('syncs on demand even from an unsynced state', async () => {
    const clock = await load()
    clock.configure({ now: () => 0, fetchImpl: async () => response('ts=5.000') })
    expect(clock.syncedAt()).toBe(0)
    expect(await clock.sync()).toBe(true)
  })

  it('keeps the previous offset when every source fails', async () => {
    const clock = await load(
      JSON.stringify({ offsetMs: 42, source: 'cloudflare', syncedAt: 1 }),
    )
    const fetchImpl = async () => response('nope')
    clock.configure({ now: () => 2, fetchImpl })
    expect(await clock.sync(true)).toBe(false)
    expect(clock.offsetMs()).toBe(42)
    expect(clock.source()).toBe('cloudflare')
  })

  it('skips a sync when the cached sample is fresh', async () => {
    let now = 1_000_000
    const fetchImpl = vi.fn(async () => response('ts=1000.000'))
    const clock = await load()
    clock.configure({ now: () => now, fetchImpl })

    expect(await clock.sync(true)).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    // Fresh, and not forced -> no second fetch.
    expect(await clock.sync()).toBe(false)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    // Stale -> resync.
    now += MAX + 1
    expect(await clock.sync()).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('ignores a concurrent sync request', async () => {
    let resolveFetch!: (value: Response) => void
    const fetchImpl = vi.fn(
      () => new Promise<Response>((resolve) => (resolveFetch = resolve)),
    )
    const clock = await load()
    clock.configure({ now: () => 0, fetchImpl: fetchImpl as unknown as typeof fetch })

    const first = clock.sync(true)
    expect(clock.syncing()).toBe(true)
    expect(await clock.sync(true)).toBe(false)
    resolveFetch(response('ts=1000.000'))
    expect(await first).toBe(true)
    expect(clock.syncing()).toBe(false)
  })

  it('falls back to the ambient fetch and clock', async () => {
    const clock = await load()
    const fetchMock = vi.fn(async () => response('ts=5000.000'))
    vi.stubGlobal('fetch', fetchMock)
    clock.configure({})

    expect(await clock.sync(true)).toBe(true)
    expect(fetchMock).toHaveBeenCalled()
    expect(clock.source()).toBe('cloudflare')
    // Network-corrected time should land on the sampled epoch (~5_000_000ms).
    expect(Math.abs(clock.now() - 5_000_000)).toBeLessThan(2000)
  })

  it('survives cache write failures', async () => {
    const clock = await load()
    clock.configure({ now: () => 0, fetchImpl: async () => response('ts=1000.000') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    expect(await clock.sync(true)).toBe(true)
  })
})
