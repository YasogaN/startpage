import { For, Show, createMemo, createSignal } from 'solid-js'
import { ENGINES, ENGINE_ORDER } from '../config/defaults'
import { buildSearchUrl, toUrl } from '../lib/search'
import { localSuggestions } from '../lib/suggest'
import type { Suggestion } from '../lib/suggest'
import { history } from '../store/history'
import { settings, setSettings } from '../store/settings'

interface Props {
  registerInput: (el: HTMLInputElement) => void
}

export default function SearchBar(props: Props) {
  const [query, setQuery] = createSignal('')
  const [active, setActive] = createSignal(-1)
  const [dismissed, setDismissed] = createSignal(false)

  const links = createMemo(() => settings.groups.flatMap((group) => group.links))

  const items = createMemo(() =>
    settings.suggestions && !dismissed()
      ? localSuggestions(query(), history.recent(), links())
      : [],
  )

  const runSearch = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const direct = toUrl(trimmed)
    if (direct) {
      window.location.assign(direct)
      return
    }
    history.remember(trimmed)
    // Non-empty input always produces a URL from the engine template.
    window.location.assign(buildSearchUrl(settings.engine, trimmed)!)
  }

  const choose = (suggestion: Suggestion) => {
    if (suggestion.url) {
      window.location.assign(suggestion.url)
      return
    }
    setQuery(suggestion.label)
    runSearch(suggestion.label)
  }

  const submit = (event: Event) => {
    event.preventDefault()
    const index = active()
    if (index >= 0 && items()[index]) {
      choose(items()[index])
      return
    }
    runSearch(query())
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (items().length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => (current + 1) % items().length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) =>
        current <= 0 ? items().length - 1 : current - 1,
      )
    } else if (event.key === 'Escape') {
      setDismissed(true)
      setActive(-1)
    }
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
          aria-expanded={items().length > 0}
          onInput={(event) => {
            setQuery(event.currentTarget.value)
            setDismissed(false)
            setActive(-1)
          }}
          onKeyDown={onKeyDown}
        />
        <button class="search-go" type="submit">
          GO
        </button>
      </form>

      <Show when={items().length > 0}>
        <ul class="suggestions" role="listbox" aria-label="Search suggestions">
          <For each={items()}>
            {(item, index) => (
              <li>
                <button
                  type="button"
                  class="suggestion"
                  classList={{ active: active() === index() }}
                  role="option"
                  aria-selected={active() === index()}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(item)}
                >
                  {item.label}
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  )
}
