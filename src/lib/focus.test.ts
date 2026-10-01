// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { getFocusableElements, trapTabKey } from './focus'

function build() {
  const root = document.createElement('div')
  root.innerHTML = [
    '<button id="a">A</button>',
    '<button id="b" disabled>B</button>',
    '<a id="c" href="#x">C</a>',
    '<input id="d" />',
    '<div id="e" tabindex="-1">E</div>',
    '<textarea id="f"></textarea>',
  ].join('')
  document.body.appendChild(root)
  return root
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('getFocusableElements', () => {
  it('returns enabled focusable controls in document order', () => {
    const root = build()
    expect(getFocusableElements(root).map((el) => el.id)).toEqual([
      'a',
      'c',
      'd',
      'f',
    ])
  })
})

describe('trapTabKey', () => {
  it('ignores non-Tab keys', () => {
    const root = build()
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    })
    expect(trapTabKey(event, root)).toBe(false)
  })

  it('ignores an empty dialog', () => {
    const root = document.createElement('div')
    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    expect(trapTabKey(event, root)).toBe(false)
  })

  it('wraps first to last on shift+Tab', () => {
    const root = build()
    const focusable = getFocusableElements(root)
    focusable[0].focus()

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      cancelable: true,
    })
    expect(trapTabKey(event, root)).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(focusable[focusable.length - 1])
  })

  it('does not wrap shift+Tab away from the first element', () => {
    const root = build()
    const focusable = getFocusableElements(root)
    focusable[1].focus()

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      cancelable: true,
    })
    expect(trapTabKey(event, root)).toBe(false)
    expect(event.defaultPrevented).toBe(false)
  })

  it('wraps last to first on Tab', () => {
    const root = build()
    const focusable = getFocusableElements(root)
    focusable[focusable.length - 1].focus()

    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    expect(trapTabKey(event, root)).toBe(true)
    expect(document.activeElement).toBe(focusable[0])
  })

  it('does not wrap Tab away from the last element', () => {
    const root = build()
    const focusable = getFocusableElements(root)
    focusable[0].focus()

    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    expect(trapTabKey(event, root)).toBe(false)
  })
})
