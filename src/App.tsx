import { createEffect, createSignal, onCleanup, onMount, untrack } from 'solid-js'
import Clock from './components/Clock'
import QuickLinks from './components/QuickLinks'
import SearchBar from './components/SearchBar'
import SettingsPanel from './components/Settings'
import ThemeToggle from './components/ThemeToggle'
import UpdateBanner from './components/UpdateBanner'
import {
  ambientMatchMedia,
  resolveTheme,
  subscribeSystemTheme,
  systemPrefersDark,
} from './lib/theme'
import { clock } from './store/clock'
import { settings, setSettings } from './store/settings'

export default function App() {
  let inputEl: HTMLInputElement | undefined
  const [settingsOpen, setSettingsOpen] = createSignal(false)
  const [systemDark, setSystemDark] = createSignal(systemPrefersDark())

  // Resolve the stored mode ("system" included) to the effective theme.
  createEffect(() => {
    const theme = resolveTheme(settings.theme, systemDark())
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff')
  })

  // Sync network time on load, and whenever the user re-enables it.
  // `untrack` keeps the effect dependent only on `syncTime`; otherwise the
  // clock's own signals would be tracked and a failed sync would retry forever.
  createEffect(() => {
    if (settings.syncTime) untrack(() => void clock.sync())
  })

  onMount(() => {
    const unsubscribe = subscribeSystemTheme(ambientMatchMedia(), (dark) =>
      setSystemDark(dark),
    )
    onCleanup(unsubscribe)

    const syncId = window.setInterval(
      () => {
        if (settings.syncTime) void clock.sync()
      },
      30 * 60 * 1000,
    )
    onCleanup(() => window.clearInterval(syncId))

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      if (event.key === '/' && !typing && !settingsOpen()) {
        event.preventDefault()
        inputEl?.focus()
        return
      }

      if (event.key === 'Escape') {
        if (settingsOpen()) {
          setSettingsOpen(false)
        } else {
          target?.blur()
        }
        return
      }

      if (event.altKey && (event.key === '1' || event.key === '2')) {
        event.preventDefault()
        setSettings('engine', event.key === '1' ? 'ddg' : 'ddg-noai')
        return
      }

      if (
        (event.key === 't' || event.key === 'T') &&
        !typing &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        setSettings(
          'theme',
          settings.theme === 'dark'
            ? 'light'
            : settings.theme === 'light'
              ? 'system'
              : 'dark',
        )
      }
    }

    window.addEventListener('keydown', onKey)
    onCleanup(() => window.removeEventListener('keydown', onKey))
  })

  return (
    <div class="shell">
      <header class="bar">
        <span class="brand">
          START<span class="dot">.</span>
        </span>
        <div class="bar-actions">
          <ThemeToggle />
          <button
            type="button"
            class="btn"
            onClick={() => setSettingsOpen(true)}
          >
            SETTINGS
          </button>
        </div>
      </header>

      <main class="main">
        <Clock />
        <SearchBar
          registerInput={(el) => {
            inputEl = el
          }}
        />
        <QuickLinks />
      </main>

      <footer class="foot">
        <span>
          <kbd>/</kbd> focus
        </span>
        <span>
          <kbd>alt</kbd>+<kbd>1/2</kbd> engine
        </span>
        <span>
          <kbd>t</kbd> theme
        </span>
        <span>
          <kbd>esc</kbd> close
        </span>
      </footer>

      <SettingsPanel
        open={settingsOpen()}
        onClose={() => setSettingsOpen(false)}
      />

      <UpdateBanner />
    </div>
  )
}
