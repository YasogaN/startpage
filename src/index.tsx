/* @refresh reload */
import { render } from 'solid-js/web'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { pwa } from './store/pwa'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-600.css'
import '@fontsource/ibm-plex-mono/latin-700.css'
import './styles/tokens.css'
import './styles/app.css'

// Precache the app shell so the startpage works fully offline. Updates install
// in the background; the user is prompted by UpdateBanner before reloading.
pwa.configure(registerSW)

export function mount(rootId = 'root'): void {
  const root = document.getElementById(rootId)
  if (!root) throw new Error(`Cannot mount: missing #${rootId} element`)
  render(() => <App />, root)
}

mount()
