// @vitest-environment jsdom
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setSettings } from '../store/settings'
import CommandPalette from './CommandPalette'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

function mount(open = true, onClose = vi.fn()) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => <CommandPalette open={open} onClose={onClose} />,
    container,
  )
  return { container, dispose, onClose }
}

function press(target: EventTarget, key: string) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  )
}

function type(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

afterEach(() => {
  document.body.innerHTML = ''
  setSettings('groups', [])
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('CommandPalette', () => {
  it('renders nothing when closed', () => {
    const { container, dispose } = mount(false)
    expect(container.querySelector('.palette')).toBeNull()
    dispose()
  })

  it('lists links, focuses the input, and navigates on click', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    setSettings('groups', [
      {
        title: 'Dev',
        links: [
          { label: 'GitHub', url: 'https://github.com/' },
          { label: 'MDN', url: 'https://developer.mozilla.org/' },
        ],
      },
    ])

    const { container, dispose } = mount()
    await tick()

    const input = container.querySelector('.palette-input') as HTMLInputElement
    expect(document.activeElement).toBe(input)
    expect(container.querySelectorAll('.palette-item')).toHaveLength(2)

    ;(container.querySelector('.palette-item') as HTMLButtonElement).click()
    expect(assign).toHaveBeenCalledWith('https://github.com/')
    dispose()
  })

  it('filters, moves the highlight and opens the active item', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    setSettings('groups', [
      {
        title: 'Dev',
        links: [
          { label: 'GitHub', url: 'https://github.com/' },
          { label: 'GitLab', url: 'https://gitlab.com/' },
        ],
      },
    ])

    const { container, dispose } = mount()
    const input = container.querySelector('.palette-input') as HTMLInputElement
    type(input, 'git')
    expect(container.querySelectorAll('.palette-item')).toHaveLength(2)

    press(input, 'ArrowDown')
    press(input, 'ArrowDown')
    press(input, 'ArrowUp')
    press(input, 'ArrowUp')
    press(input, 'x')
    press(input, 'Enter')
    expect(assign).toHaveBeenCalledWith('https://github.com/')
    dispose()
  })

  it('shows an empty state and does nothing on Enter', () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    setSettings('groups', [
      { title: 'Dev', links: [{ label: 'GitHub', url: 'https://github.com/' }] },
    ])

    const { container, dispose } = mount()
    const input = container.querySelector('.palette-input') as HTMLInputElement
    type(input, 'zzz')

    expect(container.querySelector('.palette-empty')?.textContent).toBe(
      'NO MATCHES',
    )
    press(input, 'Enter')
    expect(assign).not.toHaveBeenCalled()
    dispose()
  })

  it('closes on Escape, overlay click, and ignores inside clicks', () => {
    const { container, dispose, onClose } = mount()

    ;(container.querySelector('.palette') as HTMLElement).click()
    expect(onClose).not.toHaveBeenCalled()

    const input = container.querySelector('.palette-input') as HTMLInputElement
    press(input, 'Escape')
    expect(onClose).toHaveBeenCalledTimes(1)

    ;(container.querySelector('.palette-overlay') as HTMLElement).click()
    expect(onClose).toHaveBeenCalledTimes(2)
    dispose()
  })

  it('ignores mousedown so the input keeps focus', () => {
    setSettings('groups', [
      { title: 'Dev', links: [{ label: 'GitHub', url: 'https://github.com/' }] },
    ])
    const { container, dispose } = mount()
    const item = container.querySelector('.palette-item') as HTMLButtonElement
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    item.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    dispose()
  })
})
