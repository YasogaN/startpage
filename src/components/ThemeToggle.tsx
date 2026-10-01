import { settings, setSettings } from '../store/settings'
import type { ThemeMode } from '../types'

const ORDER: ThemeMode[] = ['dark', 'light', 'system']

const LABEL: Record<ThemeMode, string> = {
  dark: 'LIGHT',
  light: 'SYSTEM',
  system: 'DARK',
}

export default function ThemeToggle() {
  const next = () => ORDER[(ORDER.indexOf(settings.theme) + 1) % ORDER.length]

  return (
    <button
      type="button"
      class="btn"
      title="Cycle theme (t)"
      aria-label={`Switch to ${next()} theme`}
      onClick={() => setSettings('theme', next())}
    >
      {LABEL[settings.theme]}
    </button>
  )
}
