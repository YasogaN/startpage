import { afterEach, describe, expect, it, vi } from 'vitest'
import { pwa } from './pwa'
import type { RegisterServiceWorker } from './pwa'

afterEach(() => {
  pwa.dismiss()
  vi.restoreAllMocks()
})

describe('pwa store', () => {
  it('flags an update when the worker needs a refresh', () => {
    const update = vi.fn(async () => undefined)
    const register = vi.fn(
      (_options?: {
        immediate?: boolean
        onNeedRefresh?: () => void
        onOfflineReady?: () => void
      }) => update,
    )

    pwa.configure(register as unknown as RegisterServiceWorker)
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ immediate: true, onNeedRefresh: expect.any(Function) }),
    )

    // Invoke the callback the store handed to the registrar.
    const options = register.mock.calls[0][0]!
    options.onNeedRefresh!()
    expect(pwa.needRefresh()).toBe(true)
  })

  it('applies an update through the registered worker', async () => {
    const update = vi.fn(async () => undefined)
    pwa.configure((() => update) as unknown as RegisterServiceWorker)

    await pwa.applyUpdate()
    expect(update).toHaveBeenCalledWith(true)
    expect(pwa.needRefresh()).toBe(false)
  })

  it('applies safely before any worker is registered', async () => {
    vi.resetModules()
    const fresh = (await import('./pwa')).pwa
    await fresh.applyUpdate()
    expect(fresh.needRefresh()).toBe(false)
  })

  it('dismisses the update', () => {
    pwa.configure((() => undefined) as unknown as RegisterServiceWorker)
    pwa.dismiss()
    expect(pwa.needRefresh()).toBe(false)
  })
})
