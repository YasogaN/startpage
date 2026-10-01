// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

const { registerSW } = vi.hoisted(() => ({ registerSW: vi.fn() }))
vi.mock('virtual:pwa-register', () => ({ registerSW }))

describe('bootstrap', () => {
  it('mounts the app and registers the service worker', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    await import('./index')

    expect(registerSW).toHaveBeenCalledWith(
      expect.objectContaining({
        immediate: true,
        onNeedRefresh: expect.any(Function),
      }),
    )
    expect(document.querySelector('#root')?.textContent).toContain('START')
  })

  it('throws when the mount element is missing', async () => {
    const mod = await import('./index')
    document.body.innerHTML = ''

    expect(() => mod.mount('does-not-exist')).toThrow(/Cannot mount/)
  })
})
