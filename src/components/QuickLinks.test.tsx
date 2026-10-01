// @vitest-environment jsdom
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'
import { setSettings } from '../store/settings'
import QuickLinks from './QuickLinks'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

const groups = [
  { title: 'Dev', links: [{ label: 'GitHub', url: 'https://github.com/' }] },
  {
    title: 'News',
    links: [
      { label: 'HN', url: 'https://news.ycombinator.com/' },
      { label: 'Lobsters', url: 'https://lobste.rs/' },
    ],
  },
]

function mount() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(() => <QuickLinks />, container)
  return { container, dispose }
}

afterEach(() => {
  document.body.innerHTML = ''
  setSettings('groups', [])
  setSettings('favicons', true)
})

describe('QuickLinks', () => {
  it('renders one column per group with all of its links', () => {
    setSettings('groups', structuredClone(groups))
    const { container, dispose } = mount()

    const columns = [...container.querySelectorAll('.group')]
    expect(
      columns.map((column) => column.querySelector('.group-title')?.textContent),
    ).toEqual(['Dev', 'News'])
    expect(columns[0].querySelectorAll('.tile')).toHaveLength(1)
    expect(columns[1].querySelectorAll('.tile')).toHaveLength(2)

    // No tab rail / table layout.
    expect(container.querySelector('.group-tab')).toBeNull()
    expect(container.querySelector('.group-tabs')).toBeNull()

    dispose()
  })

  it('renders favicons and falls back to a monogram on error', async () => {
    setSettings('groups', [structuredClone(groups[0])])
    setSettings('favicons', true)
    const { container, dispose } = mount()

    const image = container.querySelector('.favicon') as HTMLImageElement
    expect(image.getAttribute('src')).toBe(
      'https://icons.duckduckgo.com/ip3/github.com.ico',
    )

    image.dispatchEvent(new Event('error'))
    await tick()
    expect(container.querySelector('.favicon')).toBeNull()
    expect(container.querySelector('.mono')?.textContent).toBe('G')

    dispose()
  })

  it('uses monograms when favicons are disabled', () => {
    setSettings('groups', [structuredClone(groups[0])])
    setSettings('favicons', false)
    const { container, dispose } = mount()

    expect(container.querySelector('.favicon')).toBeNull()
    expect(container.querySelector('.mono')?.textContent).toBe('G')

    dispose()
  })

  it('falls back for links with no usable hostname', () => {
    setSettings('groups', [{ title: 'Odd', links: [{ label: '!!', url: 'nope' }] }])
    setSettings('favicons', true)
    const { container, dispose } = mount()

    expect(container.querySelector('.favicon')).toBeNull()
    expect(container.querySelector('.mono')?.textContent).toBe('?')
    expect(container.querySelector('.tile-host')?.textContent).toBe('nope')

    dispose()
  })
})
