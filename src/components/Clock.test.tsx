// @vitest-environment jsdom
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clock } from '../store/clock'
import { setSettings } from '../store/settings'
import Clock from './Clock'

const at = (iso: string) => Date.parse(iso)

function mount() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(() => <Clock />, container)
  return { container, dispose }
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
  setSettings('timeZone', '')
})

describe('Clock', () => {
  it('greets according to the hour in the selected zone', () => {
    setSettings('timeZone', 'UTC')
    const cases: [string, string][] = [
      ['2026-09-27T04:30:00Z', 'GOOD NIGHT'],
      ['2026-09-27T08:30:00Z', 'GOOD MORNING'],
      ['2026-09-27T15:30:00Z', 'GOOD AFTERNOON'],
      ['2026-09-27T21:30:00Z', 'GOOD EVENING'],
    ]

    for (const [iso, expected] of cases) {
      clock.configure({ now: () => at(iso) })
      const { container, dispose } = mount()
      expect(container.querySelector('.clock-greet')?.textContent).toBe(expected)
      // Before any sync the clock reports local time.
      expect(container.querySelector('.clock-src')?.textContent).toBe('LOCAL TIME')
      dispose()
      container.remove()
    }
  })

  it('formats time and date in the selected zone', () => {
    setSettings('timeZone', 'UTC')
    clock.configure({ now: () => at('2026-09-27T10:05:09Z') })
    const { container, dispose } = mount()

    expect(container.querySelector('.clock-time')?.textContent).toBe('10:05:09')
    expect(container.querySelector('.clock-date')?.textContent).toBe(
      'SUNDAY, 27 SEPTEMBER 2026',
    )

    dispose()
  })

  it('ticks every second and stops on cleanup', async () => {
    vi.useFakeTimers()
    setSettings('timeZone', 'UTC')
    let now = at('2026-09-27T10:00:00Z')
    clock.configure({ now: () => now })

    const { container, dispose } = mount()
    expect(container.querySelector('.clock-time')?.textContent).toBe('10:00:00')

    now += 1000
    vi.advanceTimersByTime(1000)
    await Promise.resolve()
    expect(container.querySelector('.clock-time')?.textContent).toBe('10:00:01')

    dispose()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('labels a synced time source', async () => {
    setSettings('timeZone', 'UTC')
    clock.configure({
      now: () => at('2026-09-27T10:00:00Z'),
      fetchImpl: (async () => ({
        ok: true,
        text: async () => 'ts=1700000000.000',
      })) as unknown as typeof fetch,
    })
    await clock.sync(true)

    const { container, dispose } = mount()
    expect(container.querySelector('.clock-src')?.textContent).toBe(
      'SYNC: CLOUDFLARE',
    )

    dispose()
  })
})
