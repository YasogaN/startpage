import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FALLBACK_TIME_ZONE,
  TIME_ENDPOINTS,
  applyOffset,
  computeOffset,
  detectedTimeZone,
  fetchNetworkTime,
  isValidTimeZone,
  listTimeZones,
  resolveTimeZone,
} from './time'

const response = (body: string, ok = true) =>
  ({ ok, text: async () => body }) as unknown as Response

const timeApiBody = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    year: 2026,
    month: 9,
    day: 27,
    hour: 10,
    minute: 30,
    seconds: 15,
    ...extra,
  })

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('endpoint parsers', () => {
  it('exposes Cloudflare first and timeapi.io as fallback', () => {
    expect(TIME_ENDPOINTS.map((endpoint) => endpoint.source)).toEqual([
      'cloudflare',
      'timeapi',
    ])
  })

  it('parses Cloudflare seconds into milliseconds', () => {
    expect(TIME_ENDPOINTS[0].parse('colo=SIN\nts=1700000000.500\nip=1.2.3.4')).toBe(
      1700000000500,
    )
  })

  it('returns null for a Cloudflare body without ts', () => {
    expect(TIME_ENDPOINTS[0].parse('nope')).toBeNull()
  })

  it('returns null when the Cloudflare timestamp overflows', () => {
    expect(TIME_ENDPOINTS[0].parse(`ts=${'9'.repeat(400)}`)).toBeNull()
  })

  it('parses timeapi.io calendar fields', () => {
    expect(TIME_ENDPOINTS[1].parse(timeApiBody({ milliSeconds: 250 }))).toBe(
      Date.UTC(2026, 8, 27, 10, 30, 15, 250),
    )
  })

  it('defaults missing timeapi milliseconds to zero', () => {
    expect(TIME_ENDPOINTS[1].parse(timeApiBody())).toBe(
      Date.UTC(2026, 8, 27, 10, 30, 15, 0),
    )
  })

  it('returns null for invalid timeapi JSON', () => {
    expect(TIME_ENDPOINTS[1].parse('{ not json')).toBeNull()
  })

  it('returns null when timeapi fields are missing', () => {
    expect(TIME_ENDPOINTS[1].parse('{}')).toBeNull()
  })
})

describe('fetchNetworkTime', () => {
  it('returns null when fetch is unavailable', async () => {
    vi.stubGlobal('fetch', undefined)
    expect(await fetchNetworkTime()).toBeNull()
  })

  it('uses the first endpoint when it succeeds', async () => {
    const fetchImpl = vi.fn(async () => response('ts=1700000000.000'))
    const sample = await fetchNetworkTime(fetchImpl as unknown as typeof fetch)
    expect(sample).toEqual({ epoch: 1700000000000, source: 'cloudflare' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('falls through when the first response is not ok', async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      String(url).includes('cdn-cgi')
        ? response('', false)
        : response(timeApiBody()),
    )
    const sample = await fetchNetworkTime(fetchImpl as unknown as typeof fetch)
    expect(sample?.source).toBe('timeapi')
  })

  it('falls through when the first body cannot be parsed', async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      String(url).includes('cdn-cgi') ? response('nope') : response(timeApiBody()),
    )
    const sample = await fetchNetworkTime(fetchImpl as unknown as typeof fetch)
    expect(sample?.source).toBe('timeapi')
  })

  it('falls through when a request throws', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('cdn-cgi')) throw new Error('blocked')
      return response(timeApiBody())
    })
    const sample = await fetchNetworkTime(fetchImpl as unknown as typeof fetch)
    expect(sample?.source).toBe('timeapi')
  })

  it('returns null when every source fails', async () => {
    const fetchImpl = vi.fn(async () => response('nope'))
    expect(await fetchNetworkTime(fetchImpl as unknown as typeof fetch)).toBeNull()
  })

  it('aborts a hung request and returns null', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          )
        }),
    )
    const sample = await fetchNetworkTime(
      fetchImpl as unknown as typeof fetch,
      5,
    )
    expect(sample).toBeNull()
  })
})

describe('offset maths', () => {
  it('computes and applies the network offset', () => {
    expect(computeOffset(2000, 1500)).toBe(500)
    expect(applyOffset(1500, 500)).toBe(2000)
  })
})

describe('timezone helpers', () => {
  it('detects a timezone', () => {
    expect(typeof detectedTimeZone()).toBe('string')
  })

  it('falls back to UTC when detection yields an empty zone', () => {
    vi.stubGlobal('Intl', {
      ...Intl,
      DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: '' }) }),
    })
    expect(detectedTimeZone()).toBe(FALLBACK_TIME_ZONE)
  })

  it('falls back to UTC when detection throws', () => {
    vi.stubGlobal('Intl', {
      ...Intl,
      DateTimeFormat: () => {
        throw new Error('boom')
      },
    })
    expect(detectedTimeZone()).toBe(FALLBACK_TIME_ZONE)
  })

  it('validates IANA timezones', () => {
    expect(isValidTimeZone('Europe/London')).toBe(true)
    expect(isValidTimeZone('Not/AZone')).toBe(false)
    expect(isValidTimeZone('')).toBe(false)
  })

  it('lists timezones when supported', () => {
    expect(listTimeZones()).toContain('Europe/London')
  })

  it('returns an empty list when the API is unavailable', () => {
    vi.stubGlobal('Intl', {
      ...Intl,
      supportedValuesOf: () => {
        throw new Error('unsupported')
      },
    })
    expect(listTimeZones()).toEqual([])
  })

  it('resolves a preference, falling back to detection', () => {
    expect(resolveTimeZone('Europe/London')).toBe('Europe/London')
    expect(resolveTimeZone('Not/AZone')).toBe(detectedTimeZone())
    expect(resolveTimeZone('')).toBe(detectedTimeZone())
  })
})
