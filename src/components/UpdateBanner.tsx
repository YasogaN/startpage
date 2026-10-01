import { Show } from 'solid-js'
import { pwa } from '../store/pwa'

export default function UpdateBanner() {
  return (
    <Show when={pwa.needRefresh()}>
      <div class="update-banner" role="status" aria-live="polite">
        <span class="update-text">NEW VERSION AVAILABLE</span>
        <button
          type="button"
          class="btn"
          onClick={() => void pwa.applyUpdate()}
        >
          RELOAD
        </button>
        <button
          type="button"
          class="btn"
          aria-label="Dismiss update"
          onClick={() => pwa.dismiss()}
        >
          ×
        </button>
      </div>
    </Show>
  )
}
