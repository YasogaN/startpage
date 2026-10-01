import { createSignal } from 'solid-js'
import { ENGINES, ENGINE_ORDER } from '../config/defaults'
import { buildSearchUrl, toUrl } from '../lib/search'
import { settings, setSettings } from '../store/settings'

interface Props {
  registerInput: (el: HTMLInputElement) => void
}

export default function SearchBar(props: Props) {
  const [query, setQuery] = createSignal('')

  const submit = (event: Event) => {
    event.preventDefault()
    const value = query().trim()
    if (!value) return
    // Bare domains navigate directly; everything else goes to the engine.
    const direct = toUrl(value)
    if (direct) {
      window.location.assign(direct)
      return
    }
    window.location.assign(buildSearchUrl(settings.engine, value)!)
  }

  return (
    <div class="search">
      <div class="engines" role="group" aria-label="Search engine">
        {ENGINE_ORDER.map((id) => (
          <button
            type="button"
            class="engine"
            classList={{ active: settings.engine === id }}
            aria-pressed={settings.engine === id}
            title={`Use ${ENGINES[id].label}`}
            onClick={() => setSettings('engine', id)}
          >
            {ENGINES[id].label}
          </button>
        ))}
      </div>

      <form class="search-form" role="search" onSubmit={submit}>
        <input
          ref={(el) => props.registerInput(el)}
          class="search-input"
          type="text"
          name="q"
          value={query()}
          placeholder={`Search ${ENGINES[settings.engine].label} — or type a URL`}
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          aria-label="Search"
          onInput={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            // First Escape clears the field; a second one falls through to blur.
            if (event.key === 'Escape' && query() !== '') {
              event.stopPropagation()
              setQuery('')
            }
          }}
        />
        <button class="search-go" type="submit">
          GO
        </button>
      </form>
    </div>
  )
}
