// @vitest-environment jsdom
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'
import { settings, setSettings } from '../store/settings'
import ThemeToggle from './ThemeToggle'

afterEach(() => {
  document.body.innerHTML = ''
  setSettings('theme', 'dark')
})

describe('ThemeToggle', () => {
  it('cycles dark -> light -> system -> dark', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const dispose = render(() => <ThemeToggle />, container)

    const button = container.querySelector('button')!
    expect(button.textContent).toBe('LIGHT')

    button.click()
    expect(settings.theme).toBe('light')
    expect(button.textContent).toBe('SYSTEM')

    button.click()
    expect(settings.theme).toBe('system')
    expect(button.textContent).toBe('DARK')

    button.click()
    expect(settings.theme).toBe('dark')
    expect(button.textContent).toBe('LIGHT')

    dispose()
  })
})
