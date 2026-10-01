// @vitest-environment jsdom
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../config/defaults'
import { history } from '../store/history'
import { settings, setSettings } from '../store/settings'
import SearchBar from './SearchBar'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

function mount() {
  const registerInput = vi.fn()
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => <SearchBar registerInput={registerInput} />,
    container,
  )
  return { container, dispose, registerInput }
}

function type(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function submit(container: HTMLElement) {
  container
    .querySelector('form')!
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function press(target: EventTarget, key: string) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  )
}

afterEach(() => {
  document.body.innerHTML = ''
  const defaults = structuredClone(DEFAULT_SETTINGS)
  setSettings('engine', defaults.engine)
  setSettings('groups', defaults.groups)
  setSettings('suggestions', defaults.suggestions)
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('SearchBar', () => {
  it('navigates to search URLs, direct URLs, and ignores blanks', () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    const { container, dispose, registerInput } = mount()
    const input = container.querySelector('.search-input') as HTMLInputElement
    expect(registerInput).toHaveBeenCalledWith(input)

    type(input, 'solid js')
    submit(container)
    expect(assign).toHaveBeenLastCalledWith('https://duckduckgo.com/?q=solid%20js')

    type(input, 'example.com')
    submit(container)
    expect(assign).toHaveBeenLastCalledWith('https://example.com')

    type(input, '   ')
    submit(container)
    expect(assign).toHaveBeenCalledTimes(2)

    dispose()
  })

  it('switches engine and searches through it', () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    const { container, dispose } = mount()

    const buttons = container.querySelectorAll<HTMLButtonElement>('.engine')
    expect(buttons).toHaveLength(2)
    buttons[1].click()
    expect(settings.engine).toBe('ddg-noai')
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true')
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false')

    type(container.querySelector('.search-input') as HTMLInputElement, '!w brutalist')
    submit(container)
    expect(assign).toHaveBeenLastCalledWith(
      'https://noai.duckduckgo.com/?q=!w%20brutalist',
    )

    dispose()
  })

  it('shows no suggestions when the feature is off', () => {
    setSettings('suggestions', false)
    const { container, dispose } = mount()
    type(container.querySelector('.search-input') as HTMLInputElement, 'git')
    expect(container.querySelector('.suggestion')).toBeNull()
    dispose()
  })

  it('suggests saved links and navigates to the chosen one', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    setSettings('suggestions', true)
    setSettings('groups', [
      { title: 'Dev', links: [{ label: 'GitHub', url: 'https://github.com/' }] },
    ])

    const { container, dispose } = mount()
    type(container.querySelector('.search-input') as HTMLInputElement, 'git')
    await tick()

    const option = container.querySelector('.suggestion') as HTMLButtonElement
    expect(option.textContent).toBe('GitHub')
    option.click()
    expect(assign).toHaveBeenCalledWith('https://github.com/')

    dispose()
  })

  it('keyboard-selects a recent search and submits it', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    setSettings('suggestions', true)
    setSettings('groups', [])
    history.remember('brutalist architecture')

    const { container, dispose } = mount()
    const input = container.querySelector('.search-input') as HTMLInputElement
    type(input, 'brutal')
    await tick()

    press(input, 'ArrowDown')
    expect(container.querySelector('.suggestion.active')?.textContent).toBe(
      'brutalist architecture',
    )

    submit(container)
    expect(assign).toHaveBeenLastCalledWith(
      'https://duckduckgo.com/?q=brutalist%20architecture',
    )
    dispose()
  })

  it('wraps keyboard navigation and dismisses with Escape', async () => {
    setSettings('suggestions', true)
    setSettings('groups', [
      {
        title: 'Dev',
        links: [
          { label: 'Alpha', url: 'https://a.test/' },
          { label: 'Alpine', url: 'https://b.test/' },
        ],
      },
    ])

    const { container, dispose } = mount()
    const input = container.querySelector('.search-input') as HTMLInputElement
    type(input, 'alp')
    await tick()

    const options = container.querySelectorAll('.suggestion')
    expect(options).toHaveLength(2)

    // Up from no selection wraps to the last item...
    press(input, 'ArrowUp')
    expect(
      container.querySelectorAll('.suggestion')[1].classList.contains('active'),
    ).toBe(true)

    // ...and a second Up moves back one.
    press(input, 'ArrowUp')
    expect(
      container.querySelectorAll('.suggestion')[0].classList.contains('active'),
    ).toBe(true)

    // mousedown is prevented so the input keeps focus for the click.
    options[0].dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    )

    // Unrelated keys are ignored while the list is open.
    press(input, 'x')
    expect(container.querySelector('.suggestion')).not.toBeNull()

    press(input, 'Escape')
    expect(container.querySelector('.suggestion')).toBeNull()
    dispose()
  })

  it('submits the raw query when the highlighted suggestion disappears', () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    setSettings('suggestions', true)
    setSettings('groups', [
      { title: 'D', links: [{ label: 'Alpha', url: 'https://a.test/' }] },
    ])

    const { container, dispose } = mount()
    const input = container.querySelector('.search-input') as HTMLInputElement
    type(input, 'alp')
    press(input, 'ArrowDown')

    // Suggestions turn off, so the highlighted index no longer resolves.
    setSettings('suggestions', false)
    submit(container)

    expect(assign).toHaveBeenCalledWith('https://duckduckgo.com/?q=alp')
    dispose()
  })

  it('remembers a typed search for later suggestions', () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    setSettings('suggestions', false)

    const { container, dispose } = mount()
    type(container.querySelector('.search-input') as HTMLInputElement, 'local query')
    submit(container)

    expect(assign).toHaveBeenLastCalledWith(
      'https://duckduckgo.com/?q=local%20query',
    )
    expect(history.recent()[0]).toBe('local query')
    dispose()
  })
})
