import type { TemperatureUnit } from '../types'

export interface Weather {
  temperature: number
  apparentTemperature: number
  windSpeed: number
  unit: TemperatureUnit
  code: number
  description: string
  isDay: boolean
}

const API = 'https://api.open-meteo.com/v1/forecast'
const GEO_API = 'https://api.bigdatacloud.net/data/reverse-geocode-client'
const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'is_day',
  'weather_code',
  'wind_speed_10m',
].join(',')

/** WMO weather interpretation codes. */
const DESCRIPTIONS: Record<number, string> = {
  0: 'CLEAR',
  1: 'MAINLY CLEAR',
  2: 'PARTLY CLOUDY',
  3: 'OVERCAST',
  45: 'FOG',
  48: 'DEPOSITING RIME FOG',
  51: 'LIGHT DRIZZLE',
  53: 'DRIZZLE',
  55: 'DENSE DRIZZLE',
  56: 'LIGHT FREEZING DRIZZLE',
  57: 'FREEZING DRIZZLE',
  61: 'SLIGHT RAIN',
  63: 'RAIN',
  65: 'HEAVY RAIN',
  66: 'LIGHT FREEZING RAIN',
  67: 'FREEZING RAIN',
  71: 'SLIGHT SNOW',
  73: 'SNOW',
  75: 'HEAVY SNOW',
  77: 'SNOW GRAINS',
  80: 'LIGHT SHOWERS',
  81: 'SHOWERS',
  82: 'VIOLENT SHOWERS',
  85: 'SNOW SHOWERS',
  86: 'HEAVY SNOW SHOWERS',
  95: 'THUNDERSTORM',
  96: 'THUNDERSTORM WITH HAIL',
  99: 'THUNDERSTORM WITH HEAVY HAIL',
}

export function weatherUrl(
  latitude: number,
  longitude: number,
  unit: TemperatureUnit,
): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: CURRENT_FIELDS,
    timezone: 'auto',
  })
  if (unit === 'fahrenheit') params.set('temperature_unit', 'fahrenheit')
  return `${API}?${params.toString()}`
}

export function reverseGeocodeUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: 'en',
  })
  return `${GEO_API}?${params.toString()}`
}

export function describeWeatherCode(code: number): string {
  return DESCRIPTIONS[code] ?? 'UNKNOWN'
}

/** Small day/night-aware glyph for the current conditions. */
export function weatherGlyph(code: number, isDay: boolean): string {
  if (code === 0 || code === 1) return isDay ? '☀' : '☾'
  if (code === 2) return isDay ? '⛅' : '☁'
  if (code === 3 || code === 45 || code === 48) return '☁'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return '☔'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return '❄'
  if (code >= 95) return '⚡'
  return '•'
}

export function parseWeather(
  payload: unknown,
  unit: TemperatureUnit,
): Weather | null {
  if (typeof payload !== 'object' || payload === null) return null
  const current = (payload as { current?: unknown }).current
  if (typeof current !== 'object' || current === null) return null

  const values = current as Record<string, unknown>
  const temperature = values.temperature_2m
  const code = values.weather_code
  if (typeof temperature !== 'number' || typeof code !== 'number') return null

  return {
    temperature: Math.round(temperature),
    apparentTemperature:
      typeof values.apparent_temperature === 'number'
        ? Math.round(values.apparent_temperature)
        : Math.round(temperature),
    windSpeed:
      typeof values.wind_speed_10m === 'number'
        ? Math.round(values.wind_speed_10m)
        : 0,
    unit,
    code,
    description: describeWeatherCode(code),
    isDay: values.is_day === 1,
  }
}

/** Best-effort place name from a reverse-geocode payload. */
export function parsePlaceName(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) return ''
  const values = payload as Record<string, unknown>
  for (const key of ['city', 'locality', 'principalSubdivision', 'countryName']) {
    const value = values[key]
    if (typeof value === 'string' && value) return value
  }
  return ''
}

/** Fetch current weather; resolves to `null` on any failure. */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  unit: TemperatureUnit,
  fetchImpl: typeof fetch | undefined = globalThis.fetch,
  signal?: AbortSignal,
): Promise<Weather | null> {
  if (!fetchImpl) return null
  try {
    const response = await fetchImpl(weatherUrl(latitude, longitude, unit), {
      signal,
    })
    if (!response.ok) return null
    return parseWeather(await response.json(), unit)
  } catch {
    return null
  }
}

/** Resolve a place name for coordinates; resolves to `''` on any failure. */
export async function fetchPlaceName(
  latitude: number,
  longitude: number,
  fetchImpl: typeof fetch | undefined = globalThis.fetch,
  signal?: AbortSignal,
): Promise<string> {
  if (!fetchImpl) return ''
  try {
    const response = await fetchImpl(reverseGeocodeUrl(latitude, longitude), {
      signal,
    })
    if (!response.ok) return ''
    return parsePlaceName(await response.json())
  } catch {
    return ''
  }
}
