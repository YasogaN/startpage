// @vitest-environment jsdom
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pwa } from '../store/pwa'
import type { RegisterServiceWorker } from '../store/pwa'
import UpdateBanner from './UpdateBanner'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

interface RegisterOptions {
  immediate?: boolean
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
}

function mount() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(() => <UpdateBanner />, container)
  return { container, dispose }
}

function buttonByText(container: HTMLElement, text: string) {
  return [...container.querySelectorAll('button')].find(
    (button) => button.textContent === text,
  )
}

afterEach(() => {
  document.body.innerHTML = ''
  pwa.dismiss()
  vi.restoreAllMocks()
})

describe('UpdateBanner', () => {
  it('renders nothing without a pending update', () => {
    const { container, dispose } = mount()
    expect(container.querySelector('.update-banner')).toBeNull()
    dispose()
  })

  it('reloads when the user accepts the update', async () => {
    const update = vi.fn(async () => undefined)
    let options: RegisterOptions | undefined
    pwa.configure(((next: RegisterOptions) => {
      options = next
      return update
    }) as unknown as RegisterServiceWorker)
    options!.onNeedRefresh!()

    const { container, dispose } = mount()
    expect(container.querySelector('.update-banner')).not.toBeNull()

    buttonByText(container, 'RELOAD')!.click()
    await tick()
    expect(update).toHaveBeenCalledWith(true)
    expect(container.querySelector('.update-banner')).toBeNull()
    dispose()
  })

  it('dismisses the update', async () => {
    let options: RegisterOptions | undefined
    pwa.configure(((next: RegisterOptions) => {
      options = next
      return async () => undefined
    }) as unknown as RegisterServiceWorker)
    options!.onNeedRefresh!()

    const { container, dispose } = mount()
    ;(
      container.querySelector('button[aria-label="Dismiss update"]') as HTMLButtonElement
    ).click()
    await tick()
    expect(container.querySelector('.update-banner')).toBeNull()
    dispose()
  })
})
