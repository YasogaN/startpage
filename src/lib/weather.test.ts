import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  describeWeatherCode,
  fetchWeather,
  parseWeather,
  weatherUrl,
} from './weather'

const ok = (body: unknown) => ({ ok: true, json: async () => body }) as unknown as Response

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('weatherUrl', () => {
  it('builds a metric URL by default', () => {
    const url = weatherUrl(51.5, -0.12, 'celsius')
    expect(url).toContain('https://api.open-meteo.com/v1/forecast?')
    expect(url).toContain('latitude=51.5')
    expect(url).toContain('longitude=-0.12')
    expect(url).toContain('weather_code')
    expect(url).not.toContain('temperature_unit')
  })

  it('requests fahrenheit when asked', () => {
    expect(weatherUrl(1, 2, 'fahrenheit')).toContain(
      'temperature_unit=fahrenheit',
    )
  })
})

describe('describeWeatherCode', () => {
  it('maps known codes', () => {
    expect(describeWeatherCode(0)).toBe('CLEAR')
    expect(describeWeatherCode(95)).toBe('THUNDERSTORM')
  })

  it('falls back for unknown codes', () => {
    expect(describeWeatherCode(1234)).toBe('UNKNOWN')
  })
})

describe('parseWeather', () => {
  it('parses current conditions and rounds the temperature', () => {
    expect(
      parseWeather(
        { current: { temperature_2m: 12.6, weather_code: 3, is_day: 1 } },
        'celsius',
      ),
    ).toEqual({
      temperature: 13,
      unit: 'celsius',
      code: 3,
      description: 'OVERCAST',
      isDay: true,
    })
  })

  it('treats any non-1 is_day as night', () => {
    const result = parseWeather(
      { current: { temperature_2m: 0, weather_code: 0, is_day: 0 } },
      'celsius',
    )
    expect(result?.isDay).toBe(false)
  })

  it('rejects non-objects and missing current', () => {
    expect(parseWeather(null, 'celsius')).toBeNull()
    expect(parseWeather('x', 'celsius')).toBeNull()
    expect(parseWeather({}, 'celsius')).toBeNull()
  })

  it('rejects malformed values', () => {
    expect(
      parseWeather({ current: { temperature_2m: 'x', weather_code: 0 } }, 'celsius'),
    ).toBeNull()
    expect(
      parseWeather({ current: { temperature_2m: 1, weather_code: 'x' } }, 'celsius'),
    ).toBeNull()
  })
})

describe('fetchWeather', () => {
  it('returns null when fetch is unavailable', async () => {
    vi.stubGlobal('fetch', undefined)
    expect(await fetchWeather(1, 2, 'celsius')).toBeNull()
  })

  it('parses a successful response', async () => {
    const fetchImpl = vi.fn(async () =>
      ok({ current: { temperature_2m: 5, weather_code: 0, is_day: 1 } }),
    )
    const result = await fetchWeather(
      1,
      2,
      'celsius',
      fetchImpl as unknown as typeof fetch,
    )
    expect(result?.temperature).toBe(5)
  })

  it('returns null on a bad status', async () => {
    const fetchImpl = vi.fn(
      async () => ({ ok: false, json: async () => ({}) }) as unknown as Response,
    )
    expect(
      await fetchWeather(1, 2, 'celsius', fetchImpl as unknown as typeof fetch),
    ).toBeNull()
  })

  it('returns null when the payload is malformed', async () => {
    const fetchImpl = vi.fn(async () => ok({}))
    expect(
      await fetchWeather(1, 2, 'celsius', fetchImpl as unknown as typeof fetch),
    ).toBeNull()
  })

  it('returns null when the request throws', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down')
    })
    expect(
      await fetchWeather(1, 2, 'celsius', fetchImpl as unknown as typeof fetch),
    ).toBeNull()
  })
})
