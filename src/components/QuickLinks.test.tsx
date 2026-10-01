// @vitest-environment jsdom
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'
import { setSettings } from '../store/settings'
import QuickLinks from './QuickLinks'

afterEach(() => {
  document.body.innerHTML = ''
  setSettings('groups', [])
})

describe('QuickLinks', () => {
  it('renders monogram tiles with hosts and fallbacks', () => {
    setSettings('groups', [
      {
        title: 'Group',
        links: [
          { label: 'GitHub', url: 'https://github.com/' },
          { label: 'YouTube', url: 'https://www.youtube.com/' },
          { label: '!!!', url: 'not-a-url' },
        ],
      },
    ])

    const container = document.createElement('div')
    document.body.appendChild(container)
    const dispose = render(() => <QuickLinks />, container)

    expect(
      [...container.querySelectorAll('.group-title')].map((node) => node.textContent),
    ).toEqual(['Group'])
    expect(
      [...container.querySelectorAll('.mono')].map((node) => node.textContent),
    ).toEqual(['G', 'Y', '?'])
    expect(
      [...container.querySelectorAll('.tile-host')].map((node) => node.textContent),
    ).toEqual(['github.com', 'youtube.com', 'not-a-url'])

    dispose()
  })
})
