// @vitest-environment jsdom
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { DEFAULT_SETTINGS } from './config/defaults'
import { clock } from './store/clock'
import { settings, setSettings } from './store/settings'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

function mount() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(() => <App />, container)
  return { container, dispose }
}

function press(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, ...init }),
  )
}

function buttonByText(container: HTMLElement, text: string) {
  return [...container.querySelectorAll('button')].find(
    (button) => button.textContent === text,
  )
}

function resetSettings() {
  const defaults = structuredClone(DEFAULT_SETTINGS)
  setSettings('theme', defaults.theme)
  setSettings('engine', defaults.engine)
  setSettings('timeZone', defaults.timeZone)
  setSettings('syncTime', defaults.syncTime)
  setSettings('favicons', defaults.favicons)
  setSettings('suggestions', defaults.suggestions)
  setSettings('groups', defaults.groups)
}

beforeEach(() => {
  // The app triggers a clock sync on mount; keep it off the network.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('offline')
    }),
  )
})

afterEach(() => {
  document.body.innerHTML = ''
  document.head
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((node) => node.remove())
  localStorage.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  resetSettings()
})

describe('App', () => {
  it('renders the clock, search, engine toggle and link tiles', () => {
    const { container, dispose } = mount()

    expect(container.textContent).toContain('START')
    expect(container.querySelector('.clock-time')?.textContent).toMatch(
      /^\d{2}:\d{2}:\d{2}$/,
    )
    expect(container.querySelector('.search-input')).not.toBeNull()
    expect(container.querySelectorAll('.engine')).toHaveLength(2)
    expect(container.querySelectorAll('.tile').length).toBeGreaterThan(0)

    dispose()
  })

  it('switches the engine and persists the choice to localStorage', async () => {
    const { container, dispose } = mount()
    const engines = container.querySelectorAll<HTMLButtonElement>('.engine')
    engines[1].click()
    await tick()

    expect(localStorage.getItem('startpage.settings.v1')).toContain('ddg-noai')
    dispose()
  })

  it('opens the settings dialog', async () => {
    const { container, dispose } = mount()
    buttonByText(container, 'SETTINGS')!.click()
    await tick()

    expect(container.querySelector('[role="dialog"]')).not.toBeNull()
    dispose()
  })

  it('keeps the theme-color meta in sync', async () => {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)

    const { dispose } = mount()
    expect(meta.getAttribute('content')).toBe('#000000')

    setSettings('theme', 'light')
    await tick()
    expect(meta.getAttribute('content')).toBe('#ffffff')

    dispose()
  })

  it('submits a search from the shell', () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    const { container, dispose } = mount()

    const input = container.querySelector('.search-input') as HTMLInputElement
    input.value = 'solid'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    expect(assign).toHaveBeenCalledWith('https://duckduckgo.com/?q=solid')
    dispose()
  })

  it('focuses the search input with /', () => {
    const { container, dispose } = mount()
    const input = container.querySelector('.search-input') as HTMLInputElement

    press(document.body, '/')
    expect(document.activeElement).toBe(input)
    dispose()
  })

  it('ignores / while typing in a field', () => {
    const { container, dispose } = mount()
    const input = container.querySelector('.search-input') as HTMLInputElement
    input.blur()

    press(input, '/')
    expect(document.activeElement).not.toBe(input)
    dispose()
  })

  it('ignores / while settings are open', () => {
    const { container, dispose } = mount()
    buttonByText(container, 'SETTINGS')!.click()
    press(document.body, '/')

    const input = container.querySelector('.search-input') as HTMLInputElement
    expect(document.activeElement).not.toBe(input)
    dispose()
  })

  it('closes settings from the panel button', () => {
    const { container, dispose } = mount()
    buttonByText(container, 'SETTINGS')!.click()
    expect(container.querySelector('[role="dialog"]')).not.toBeNull()

    buttonByText(container, 'CLOSE')!.click()
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    dispose()
  })

  it('closes settings with Escape', () => {
    const { container, dispose } = mount()
    buttonByText(container, 'SETTINGS')!.click()
    expect(container.querySelector('[role="dialog"]')).not.toBeNull()

    press(document.body, 'Escape')
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    dispose()
  })

  it('blurs the active field with Escape', () => {
    const { container, dispose } = mount()
    const input = container.querySelector('.search-input') as HTMLInputElement
    input.focus()
    expect(document.activeElement).toBe(input)

    press(input, 'Escape')
    expect(document.activeElement).not.toBe(input)
    dispose()
  })

  it('switches engines with Alt+1 and Alt+2', () => {
    const { dispose } = mount()
    setSettings('engine', 'ddg-noai')

    press(document.body, '1', { altKey: true })
    expect(settings.engine).toBe('ddg')

    press(document.body, '2', { altKey: true })
    expect(settings.engine).toBe('ddg-noai')

    dispose()
  })

  it('cycles the theme with t, but not while typing or with modifiers', () => {
    const { container, dispose } = mount()
    setSettings('theme', 'dark')

    press(document.body, 't')
    expect(settings.theme).toBe('light')

    press(document.body, 'T')
    expect(settings.theme).toBe('system')

    // system -> dark closes the cycle.
    press(document.body, 't')
    expect(settings.theme).toBe('dark')

    press(document.body, 't', { ctrlKey: true })
    expect(settings.theme).toBe('dark')

    press(document.body, 't', { altKey: true })
    expect(settings.theme).toBe('dark')

    const input = container.querySelector('.search-input') as HTMLInputElement
    press(input, 't')
    expect(settings.theme).toBe('dark')

    dispose()
  })

  it('resolves the system theme and follows preference changes', async () => {
    let handler: ((event: { matches: boolean }) => void) | undefined
    const query = {
      matches: false,
      addEventListener: (
        _type: string,
        listener: (event: { matches: boolean }) => void,
      ) => {
        handler = listener
      },
    }
    vi.stubGlobal('matchMedia', () => query)
    setSettings('theme', 'system')

    const { dispose } = mount()
    expect(document.documentElement.dataset.theme).toBe('light')

    handler!({ matches: true })
    await tick()
    expect(document.documentElement.dataset.theme).toBe('dark')

    dispose()
  })

  it('does not sync on load when network time is disabled', () => {
    const syncSpy = vi.spyOn(clock, 'sync').mockResolvedValue(true)
    setSettings('syncTime', false)

    const { dispose } = mount()
    expect(syncSpy).not.toHaveBeenCalled()
    dispose()
  })

  it('does not sync from the timer when network time is disabled', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval')
    const syncSpy = vi.spyOn(clock, 'sync').mockResolvedValue(true)
    setSettings('syncTime', false)

    const { dispose } = mount()
    const halfHour = setIntervalSpy.mock.calls.find(
      ([, delay]) => delay === 30 * 60 * 1000,
    )!
    ;(halfHour[0] as () => void)()
    expect(syncSpy).not.toHaveBeenCalled()
    dispose()
  })

  it('re-syncs on the half-hour timer', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval')
    const syncSpy = vi.spyOn(clock, 'sync').mockResolvedValue(true)

    const { dispose } = mount()
    const halfHour = setIntervalSpy.mock.calls.find(
      ([, delay]) => delay === 30 * 60 * 1000,
    )
    expect(halfHour).toBeDefined()

    const before = syncSpy.mock.calls.length
    ;(halfHour![0] as () => void)()
    expect(syncSpy.mock.calls.length).toBeGreaterThan(before)

    dispose()
  })
})
