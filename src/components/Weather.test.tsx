// @vitest-environment jsdom
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setSettings } from '../store/settings'
import { weather } from '../store/weather'
import Weather from './Weather'

const payload = () => ({
  current: { temperature_2m: 7, weather_code: 0, is_day: 1 },
})
const ok = () => ({ ok: true, json: async () => payload() }) as unknown as Response

function mount() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(() => <Weather />, container)
  return { container, dispose }
}

afterEach(() => {
  document.body.innerHTML = ''
  setSettings('weather', {
    enabled: false,
    latitude: null,
    longitude: null,
    label: '',
    unit: 'celsius',
  })
  vi.restoreAllMocks()
})

describe('Weather', () => {
  it('renders nothing when disabled', () => {
    setSettings('weather', 'enabled', false)
    const { container, dispose } = mount()
    expect(container.querySelector('.weather')).toBeNull()
    dispose()
  })

  it('shows a status label before the first reading', () => {
    setSettings('weather', 'enabled', true)
    const { container, dispose } = mount()
    expect(container.querySelector('.weather-status')?.textContent).toBe(
      'SET A LOCATION',
    )
    dispose()
  })

  it('shows the temperature, description and place', async () => {
    setSettings('weather', 'enabled', true)
    setSettings('weather', 'label', 'LONDON')
    setSettings('weather', 'latitude', 51.5)
    setSettings('weather', 'longitude', -0.12)
    weather.configure({
      fetchImpl: (async () => ok()) as unknown as typeof fetch,
    })
    await weather.refresh()

    const { container, dispose } = mount()
    expect(container.querySelector('.weather-temp')?.textContent).toBe('7°C')
    expect(container.querySelector('.weather-desc')?.textContent).toBe('CLEAR')
    expect(container.querySelector('.weather-place')?.textContent).toBe('LONDON')
    dispose()
  })

  it('uses fahrenheit and hides an empty place', async () => {
    setSettings('weather', 'enabled', true)
    setSettings('weather', 'label', '')
    setSettings('weather', 'unit', 'fahrenheit')
    setSettings('weather', 'latitude', 1)
    setSettings('weather', 'longitude', 2)
    weather.configure({
      fetchImpl: (async () => ok()) as unknown as typeof fetch,
    })
    await weather.refresh()

    const { container, dispose } = mount()
    expect(container.querySelector('.weather-temp')?.textContent).toBe('7°F')
    expect(container.querySelector('.weather-place')).toBeNull()
    dispose()
  })
})
