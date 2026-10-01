import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  describeWeatherCode,
  fetchPlaceName,
  fetchWeather,
  parsePlaceName,
  parseWeather,
  reverseGeocodeUrl,
  weatherGlyph,
  weatherUrl,
} from './weather'

const ok = (body: unknown) =>
  ({ ok: true, json: async () => body }) as unknown as Response

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('weatherUrl', () => {
  it('builds a metric URL with the extra fields', () => {
    const url = weatherUrl(51.5, -0.12, 'celsius')
    expect(url).toContain('https://api.open-meteo.com/v1/forecast?')
    expect(url).toContain('latitude=51.5')
    expect(url).toContain('longitude=-0.12')
    expect(url).toContain('apparent_temperature')
    expect(url).toContain('wind_speed_10m')
    expect(url).not.toContain('temperature_unit')
  })

  it('requests fahrenheit when asked', () => {
    expect(weatherUrl(1, 2, 'fahrenheit')).toContain(
      'temperature_unit=fahrenheit',
    )
  })
})

describe('reverseGeocodeUrl', () => {
  it('targets the reverse geocode endpoint', () => {
    const url = reverseGeocodeUrl(1.5, 2.5)
    expect(url).toContain('api.bigdatacloud.net/data/reverse-geocode-client')
    expect(url).toContain('latitude=1.5')
    expect(url).toContain('longitude=2.5')
    expect(url).toContain('localityLanguage=en')
  })
})

describe('describeWeatherCode', () => {
  it('maps known codes and falls back for unknown ones', () => {
    expect(describeWeatherCode(0)).toBe('CLEAR')
    expect(describeWeatherCode(95)).toBe('THUNDERSTORM')
    expect(describeWeatherCode(1234)).toBe('UNKNOWN')
  })
})

describe('weatherGlyph', () => {
  it('picks day and night glyphs for clear skies', () => {
    expect(weatherGlyph(0, true)).toBe('☀')
    expect(weatherGlyph(1, false)).toBe('☾')
  })

  it('handles the other condition groups', () => {
    expect(weatherGlyph(2, true)).toBe('⛅')
    expect(weatherGlyph(2, false)).toBe('☁')
    expect(weatherGlyph(3, true)).toBe('☁')
    expect(weatherGlyph(45, true)).toBe('☁')
    expect(weatherGlyph(51, true)).toBe('☔')
    expect(weatherGlyph(80, true)).toBe('☔')
    expect(weatherGlyph(71, true)).toBe('❄')
    expect(weatherGlyph(85, true)).toBe('❄')
    expect(weatherGlyph(95, true)).toBe('⚡')
    expect(weatherGlyph(4, true)).toBe('•')
  })
})

describe('parseWeather', () => {
  it('parses current conditions and rounds values', () => {
    expect(
      parseWeather(
        {
          current: {
            temperature_2m: 12.6,
            apparent_temperature: 10.2,
            wind_speed_10m: 5.4,
            weather_code: 3,
            is_day: 1,
          },
        },
        'celsius',
      ),
    ).toEqual({
      temperature: 13,
      apparentTemperature: 10,
      windSpeed: 5,
      unit: 'celsius',
      code: 3,
      description: 'OVERCAST',
      isDay: true,
    })
  })

  it('defaults the optional fields', () => {
    const result = parseWeather(
      { current: { temperature_2m: 8, weather_code: 0, is_day: 0 } },
      'celsius',
    )
    expect(result?.apparentTemperature).toBe(8)
    expect(result?.windSpeed).toBe(0)
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

describe('parsePlaceName', () => {
  it('uses the first available label', () => {
    expect(parsePlaceName({ city: 'London' })).toBe('London')
    expect(parsePlaceName({ locality: 'Camden' })).toBe('Camden')
    expect(parsePlaceName({ principalSubdivision: 'England' })).toBe('England')
    expect(parsePlaceName({ countryName: 'United Kingdom' })).toBe(
      'United Kingdom',
    )
  })

  it('returns an empty string when nothing usable exists', () => {
    expect(parsePlaceName(null)).toBe('')
    expect(parsePlaceName({ city: 5 })).toBe('')
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

  it('returns null on a bad status, malformed payload, or throw', async () => {
    const bad = vi.fn(
      async () => ({ ok: false, json: async () => ({}) }) as unknown as Response,
    )
    expect(
      await fetchWeather(1, 2, 'celsius', bad as unknown as typeof fetch),
    ).toBeNull()

    const malformed = vi.fn(async () => ok({}))
    expect(
      await fetchWeather(1, 2, 'celsius', malformed as unknown as typeof fetch),
    ).toBeNull()

    const boom = vi.fn(async () => {
      throw new Error('down')
    })
    expect(
      await fetchWeather(1, 2, 'celsius', boom as unknown as typeof fetch),
    ).toBeNull()
  })
})

describe('fetchPlaceName', () => {
  it('returns an empty string when fetch is unavailable', async () => {
    vi.stubGlobal('fetch', undefined)
    expect(await fetchPlaceName(1, 2)).toBe('')
  })

  it('parses a successful response', async () => {
    const fetchImpl = vi.fn(async () => ok({ city: 'London' }))
    expect(
      await fetchPlaceName(1, 2, fetchImpl as unknown as typeof fetch),
    ).toBe('London')
  })

  it('returns an empty string on failure', async () => {
    const bad = vi.fn(
      async () => ({ ok: false, json: async () => ({}) }) as unknown as Response,
    )
    expect(
      await fetchPlaceName(1, 2, bad as unknown as typeof fetch),
    ).toBe('')

    const boom = vi.fn(async () => {
      throw new Error('down')
    })
    expect(
      await fetchPlaceName(1, 2, boom as unknown as typeof fetch),
    ).toBe('')
  })
})
