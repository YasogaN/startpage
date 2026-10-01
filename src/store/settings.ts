import { createEffect, createRoot } from 'solid-js'
import { createStore } from 'solid-js/store'
import { loadSettings, saveSettings } from '../lib/storage'
import type { Settings } from '../types'

/**
 * Single app-wide settings store. Hydrated from localStorage on creation and
 * persisted on every change. Wrapped in `createRoot` so the persistence effect
 * has an owner even though the store lives at module scope.
 */
export const { settings, setSettings } = createRoot(() => {
  const [settings, setSettings] = createStore<Settings>(loadSettings())

  createEffect(() => {
    // JSON round-trip reads every field, so the effect tracks the whole store.
    saveSettings(JSON.parse(JSON.stringify(settings)) as Settings)
  })

  return { settings, setSettings }
})
