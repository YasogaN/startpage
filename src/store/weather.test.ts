// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { statusLabel } from './weather'
import type { WeatherStatus } from './weather'

const CACHE_KEY = 'startpage.weather.v1'

const payload = () => ({
  current: {
    temperature_2m: 7,
    apparent_temperature: 5,
    wind_speed_10m: 9,
    weather_code: 0,
    is_day: 1,
  },
})
const ok = (body: unknown) =>
  ({ ok: true, json: async () => body }) as unknown as Response

async function load(seed?: string) {
  vi.resetModules()
  localStorage.clear()
  if (seed !== undefined) localStorage.setItem(CACHE_KEY, seed)
  const settingsModule = await import('./settings')
  const weatherModule = await import('./weather')
  return {
    weather: weatherModule.weather,
    settings: settingsModule.settings,
    setSettings: settingsModule.setSettings,
  }
}

function stubGeolocation(value: unknown) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  stubGeolocation(undefined)
})

describe('cache hydration', () => {
  it('starts with no reading', async () => {
    const { weather } = await load()
    expect(weather.data()).toBeNull()
  })

  it('hydrates a valid cache', async () => {
    const { weather } = await load(
      JSON.stringify({
        temperature: 3,
        apparentTemperature: 1,
        windSpeed: 12,
        unit: 'fahrenheit',
        code: 1,
        description: 'MAINLY CLEAR',
        isDay: true,
      }),
    )
    expect(weather.data()).toEqual({
      temperature: 3,
      apparentTemperature: 1,
      windSpeed: 12,
      unit: 'fahrenheit',
      code: 1,
      description: 'MAINLY CLEAR',
      isDay: true,
    })
  })

  it('defaults missing cache fields', async () => {
    const { weather } = await load(JSON.stringify({ temperature: 1, code: 2 }))
    expect(weather.data()).toEqual({
      temperature: 1,
      apparentTemperature: 1,
      windSpeed: 0,
      unit: 'celsius',
      code: 2,
      description: 'UNKNOWN',
      isDay: false,
    })
  })

  it('ignores invalid or incomplete caches', async () => {
    expect((await load('{ broken')).weather.data()).toBeNull()
    expect((await load(JSON.stringify({}))).weather.data()).toBeNull()
  })
})

describe('refresh', () => {
  it('reports an unset location without coordinates', async () => {
    const { weather } = await load()
    expect(await weather.refresh()).toBe(false)
    expect(weather.status()).toBe('unset')
  })

  it('stores a successful reading', async () => {
    const { weather, setSettings } = await load()
    setSettings('weather', 'latitude', 51.5)
    setSettings('weather', 'longitude', -0.12)
    weather.configure({
      fetchImpl: (async () => ok(payload())) as unknown as typeof fetch,
    })

    expect(await weather.refresh()).toBe(true)
    expect(weather.status()).toBe('ready')
    expect(weather.data()?.temperature).toBe(7)
    expect(weather.data()?.apparentTemperature).toBe(5)
    expect(localStorage.getItem(CACHE_KEY)).toContain('"temperature":7')
  })

  it('retries once after a failed request', async () => {
    const { weather, setSettings } = await load()
    setSettings('weather', 'latitude', 1)
    setSettings('weather', 'longitude', 2)
    let calls = 0
    weather.configure({
      fetchImpl: (async () => {
        calls += 1
        if (calls === 1) throw new Error('blip')
        return ok(payload())
      }) as unknown as typeof fetch,
    })

    expect(await weather.refresh()).toBe(true)
    expect(calls).toBe(2)
    expect(weather.status()).toBe('ready')
    expect(weather.data()?.temperature).toBe(7)
  })

  it('reports an error and keeps the previous reading', async () => {
    const { weather, setSettings } = await load()
    setSettings('weather', 'latitude', 1)
    setSettings('weather', 'longitude', 2)
    weather.configure({
      fetchImpl: (async () => ok(payload())) as unknown as typeof fetch,
    })
    await weather.refresh()

    weather.configure({
      fetchImpl: (async () => {
        throw new Error('offline')
      }) as unknown as typeof fetch,
    })
    expect(await weather.refresh()).toBe(false)
    expect(weather.status()).toBe('error')
    expect(weather.data()?.temperature).toBe(7)
  })

  it('falls back to the ambient fetch', async () => {
    const { weather, setSettings } = await load()
    setSettings('weather', 'latitude', 1)
    setSettings('weather', 'longitude', 2)
    const fetchMock = vi.fn(async () => ok(payload()))
    vi.stubGlobal('fetch', fetchMock)
    weather.configure({})

    expect(await weather.refresh()).toBe(true)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('clears the cached reading', async () => {
    const { weather, setSettings } = await load()
    setSettings('weather', 'latitude', 1)
    setSettings('weather', 'longitude', 2)
    weather.configure({
      fetchImpl: (async () => ok(payload())) as unknown as typeof fetch,
    })
    await weather.refresh()

    weather.clear()
    expect(weather.data()).toBeNull()
    expect(weather.status()).toBe('idle')
    expect(localStorage.getItem(CACHE_KEY)).toBeNull()
  })

  it('tolerates storage failures when clearing', async () => {
    const { weather } = await load()
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => weather.clear()).not.toThrow()
  })
})

describe('useCurrentLocation', () => {
  it('reports when geolocation is unsupported', async () => {
    const { weather } = await load()
    expect(await weather.useCurrentLocation()).toBe(false)
    expect(weather.status()).toBe('unsupported')
  })

  it('stores the coordinates, refreshes and fills the place name', async () => {
    const { weather, settings } = await load()
    const fetchImpl = vi.fn(async (url: string) =>
      String(url).includes('reverse-geocode')
        ? ok({ city: 'London' })
        : ok(payload()),
    )
    weather.configure({ fetchImpl: fetchImpl as unknown as typeof fetch })
    stubGeolocation({
      getCurrentPosition: (success: (position: unknown) => void) =>
        success({ coords: { latitude: 10, longitude: 20 } }),
    })

    expect(await weather.useCurrentLocation()).toBe(true)
    expect(settings.weather.latitude).toBe(10)
    expect(settings.weather.longitude).toBe(20)
    expect(settings.weather.label).toBe('London')
    expect(weather.data()?.temperature).toBe(7)
  })

  it('keeps an existing place name', async () => {
    const { weather, settings, setSettings } = await load()
    setSettings('weather', 'label', 'Custom')
    const fetchImpl = vi.fn(async (_url: string) => ok(payload()))
    weather.configure({ fetchImpl: fetchImpl as unknown as typeof fetch })
    stubGeolocation({
      getCurrentPosition: (success: (position: unknown) => void) =>
        success({ coords: { latitude: 10, longitude: 20 } }),
    })

    await weather.useCurrentLocation()
    expect(settings.weather.label).toBe('Custom')
    expect(
      fetchImpl.mock.calls.some(([url]) => String(url).includes('reverse-geocode')),
    ).toBe(false)
  })

  it('leaves the label empty when nothing resolves', async () => {
    const { weather, settings } = await load()
    const fetchImpl = vi.fn(async (url: string) =>
      String(url).includes('reverse-geocode') ? ok({}) : ok(payload()),
    )
    weather.configure({ fetchImpl: fetchImpl as unknown as typeof fetch })
    stubGeolocation({
      getCurrentPosition: (success: (position: unknown) => void) =>
        success({ coords: { latitude: 10, longitude: 20 } }),
    })

    await weather.useCurrentLocation()
    expect(settings.weather.label).toBe('')
  })

  it('reports a denied permission', async () => {
    const { weather } = await load()
    stubGeolocation({
      getCurrentPosition: (
        _success: unknown,
        error: (err: unknown) => void,
      ) => error(new Error('denied')),
    })

    expect(await weather.useCurrentLocation()).toBe(false)
    expect(weather.status()).toBe('denied')
  })
})

describe('statusLabel', () => {
  it('labels every status', () => {
    const statuses: WeatherStatus[] = [
      'idle',
      'loading',
      'ready',
      'error',
      'unsupported',
      'denied',
      'unset',
    ]
    for (const status of statuses) {
      expect(typeof statusLabel(status)).toBe('string')
    }
    expect(statusLabel('denied')).toBe('LOCATION DENIED')
  })
})
