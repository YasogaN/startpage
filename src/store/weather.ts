import { createRoot, createSignal } from 'solid-js'
import { fetchPlaceName, fetchWeather } from '../lib/weather'
import type { Weather } from '../lib/weather'
import { settings, setSettings } from './settings'

export type WeatherStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'unsupported'
  | 'denied'
  | 'unset'

const CACHE_KEY = 'startpage.weather.v1'

const LABELS: Record<WeatherStatus, string> = {
  idle: 'SET A LOCATION',
  unset: 'SET A LOCATION',
  loading: 'LOADING…',
  ready: '',
  error: 'UNAVAILABLE',
  unsupported: 'GEOLOCATION UNSUPPORTED',
  denied: 'LOCATION DENIED',
}

export function statusLabel(status: WeatherStatus): string {
  return LABELS[status]
}

function readCache(): Weather | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Weather>
    if (typeof parsed.temperature !== 'number' || typeof parsed.code !== 'number') {
      return null
    }
    return {
      temperature: parsed.temperature,
      apparentTemperature:
        typeof parsed.apparentTemperature === 'number'
          ? parsed.apparentTemperature
          : parsed.temperature,
      windSpeed: typeof parsed.windSpeed === 'number' ? parsed.windSpeed : 0,
      unit: parsed.unit === 'fahrenheit' ? 'fahrenheit' : 'celsius',
      code: parsed.code,
      description:
        typeof parsed.description === 'string' ? parsed.description : 'UNKNOWN',
      isDay: parsed.isDay === true,
    }
  } catch {
    return null
  }
}

function writeCache(value: Weather): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value))
  } catch {
    // Storage unavailable — weather still works for this session.
  }
}

interface WeatherOptions {
  fetchImpl?: typeof fetch
}

export const weather = createRoot(() => {
  // Seed with the last known reading so something shows before the first fetch.
  const [data, setData] = createSignal<Weather | null>(readCache())
  const [status, setStatus] = createSignal<WeatherStatus>('idle')
  const [locating, setLocating] = createSignal(false)
  let options: WeatherOptions = {}

  const refresh = async (): Promise<boolean> => {
    const { latitude, longitude, unit } = settings.weather
    if (latitude === null || longitude === null) {
      setStatus('unset')
      return false
    }

    setStatus('loading')
    const result = await fetchWeather(
      latitude,
      longitude,
      unit,
      options.fetchImpl,
    )
    if (!result) {
      setStatus('error')
      return false
    }

    setData(result)
    setStatus('ready')
    writeCache(result)
    return true
  }

  const useCurrentLocation = (): Promise<boolean> =>
    new Promise((resolve) => {
      const geolocation = navigator.geolocation
      if (!geolocation) {
        setStatus('unsupported')
        resolve(false)
        return
      }

      setLocating(true)
      geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          setSettings('weather', 'latitude', latitude)
          setSettings('weather', 'longitude', longitude)
          setLocating(false)
          await refresh()
          if (settings.weather.label === '') {
            const name = await fetchPlaceName(latitude, longitude, options.fetchImpl)
            if (name) setSettings('weather', 'label', name)
          }
          resolve(true)
        },
        () => {
          setStatus('denied')
          setLocating(false)
          resolve(false)
        },
        { timeout: 10000, maximumAge: 600000 },
      )
    })

  /** Drop the cached reading. */
  const clear = () => {
    setData(null)
    setStatus('idle')
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch {
      // Storage unavailable — nothing to clear.
    }
  }

  /** Test seam: inject a fetch implementation. */
  const configure = (next: WeatherOptions) => {
    options = next
  }

  return { data, status, locating, refresh, useCurrentLocation, configure, clear }
})
