import { createRoot, createSignal } from 'solid-js'

export type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

export type RegisterServiceWorker = (options?: {
  immediate?: boolean
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
}) => UpdateServiceWorker

/**
 * Tracks whether a new service worker build is waiting to activate. The app
 * shows a banner and only reloads when the user asks, so an in-progress
 * interaction is never interrupted.
 */
export const pwa = createRoot(() => {
  const [needRefresh, setNeedRefresh] = createSignal(false)
  let updateServiceWorker: UpdateServiceWorker | undefined

  const configure = (register: RegisterServiceWorker) => {
    updateServiceWorker = register({
      immediate: true,
      onNeedRefresh: () => setNeedRefresh(true),
    })
  }

  const applyUpdate = async () => {
    await updateServiceWorker?.(true)
    setNeedRefresh(false)
  }

  const dismiss = () => setNeedRefresh(false)

  return { needRefresh, configure, applyUpdate, dismiss }
})
