import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js'
import Clock from './components/Clock'
import CommandPalette from './components/CommandPalette'
import QuickLinks from './components/QuickLinks'
import SearchBar from './components/SearchBar'
import SettingsPanel from './components/Settings'
import ThemeToggle from './components/ThemeToggle'
import UpdateBanner from './components/UpdateBanner'
import Weather from './components/Weather'
import {
  ambientMatchMedia,
  resolveTheme,
  subscribeSystemTheme,
  systemPrefersDark,
} from './lib/theme'
import { clock } from './store/clock'
import { settings, setSettings } from './store/settings'
import { weather } from './store/weather'

export default function App() {
  let inputEl: HTMLInputElement | undefined
  const [settingsOpen, setSettingsOpen] = createSignal(false)
  const [paletteOpen, setPaletteOpen] = createSignal(false)
  const [online, setOnline] = createSignal(navigator.onLine)
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

  // Refresh weather when it is enabled, or when the location/unit changes.
  createEffect(() => {
    const { enabled, latitude, longitude, unit } = settings.weather
    if (enabled && latitude !== null && longitude !== null) {
      void unit
      untrack(() => void weather.refresh())
    }
  })

  onMount(() => {
    // Type-to-search straight away.
    inputEl?.focus()

    const unsubscribe = subscribeSystemTheme(ambientMatchMedia(), (dark) =>
      setSystemDark(dark),
    )
    onCleanup(unsubscribe)

    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    onCleanup(() => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    })

    const syncId = window.setInterval(
      () => {
        if (settings.syncTime) void clock.sync()
      },
      30 * 60 * 1000,
    )
    onCleanup(() => window.clearInterval(syncId))

    const weatherId = window.setInterval(
      () => {
        if (settings.weather.enabled) void weather.refresh()
      },
      15 * 60 * 1000,
    )
    onCleanup(() => window.clearInterval(weatherId))

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((current) => !current)
        return
      }

      if (event.key === '/' && !typing && !settingsOpen() && !paletteOpen()) {
        event.preventDefault()
        inputEl?.focus()
        return
      }

      if (event.key === 'Escape') {
        if (paletteOpen()) {
          setPaletteOpen(false)
        } else if (settingsOpen()) {
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
          STARTPAGE<span class="dot">.</span>
        </span>
        <div class="bar-actions">
          <Show when={!online()}>
            <span class="offline-badge">OFFLINE</span>
          </Show>
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
        <Weather />
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

      <CommandPalette
        open={paletteOpen()}
        onClose={() => setPaletteOpen(false)}
      />

      <UpdateBanner />
    </div>
  )
}
