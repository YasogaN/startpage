import { createRoot, createSignal } from 'solid-js'
import { fetchWeather } from '../lib/weather'
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
        (position) => {
          setSettings('weather', 'latitude', position.coords.latitude)
          setSettings('weather', 'longitude', position.coords.longitude)
          setLocating(false)
          void refresh().then(resolve)
        },
        () => {
          setStatus('denied')
          setLocating(false)
          resolve(false)
        },
        { timeout: 10000, maximumAge: 600000 },
      )
    })

  /** Test seam: inject a fetch implementation. */
  const configure = (next: WeatherOptions) => {
    options = next
  }

  return { data, status, locating, refresh, useCurrentLocation, configure }
})
