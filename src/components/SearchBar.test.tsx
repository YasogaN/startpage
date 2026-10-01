// @vitest-environment jsdom
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { settings, setSettings } from '../store/settings'
import SearchBar from './SearchBar'

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

afterEach(() => {
  document.body.innerHTML = ''
  setSettings('engine', 'ddg')
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
})
