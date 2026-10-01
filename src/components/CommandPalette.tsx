import { For, Show, createEffect, createMemo, createSignal } from 'solid-js'
import { hostnameOf } from '../lib/links'
import { rankLinks } from '../lib/palette'
import { settings } from '../store/settings'
import type { LinkItem } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CommandPalette(props: Props) {
  const [query, setQuery] = createSignal('')
  const [active, setActive] = createSignal(0)
  let inputEl: HTMLInputElement | undefined

  const results = createMemo(() =>
    rankLinks(
      settings.groups.flatMap((group) => group.links),
      query(),
    ),
  )

  createEffect(() => {
    if (props.open) {
      setQuery('')
      setActive(0)
      inputEl?.focus()
    }
  })

  const go = (link: LinkItem) => {
    window.location.assign(link.url)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => (current + 1) % Math.max(results().length, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) =>
        current <= 0 ? Math.max(results().length - 1, 0) : current - 1,
      )
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const link = results()[active()]
      if (link) go(link)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      props.onClose()
    }
  }

  return (
    <Show when={props.open}>
      <div class="palette-overlay" onClick={props.onClose}>
        <div
          class="palette"
          role="dialog"
          aria-modal="true"
          aria-label="Jump to link"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            ref={(el) => {
              inputEl = el
            }}
            class="palette-input"
            type="text"
            placeholder="JUMP TO LINK…"
            aria-label="Jump to link"
            value={query()}
            onInput={(event) => {
              setQuery(event.currentTarget.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
          />
          <Show
            when={results().length > 0}
            fallback={<p class="palette-empty">NO MATCHES</p>}
          >
            <ul class="palette-list">
              <For each={results()}>
                {(link, index) => (
                  <li>
                    <button
                      type="button"
                      class="palette-item"
                      classList={{ active: active() === index() }}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => go(link)}
                    >
                      <span class="palette-label">{link.label}</span>
                      <span class="palette-host">{hostnameOf(link.url)}</span>
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>
      </div>
    </Show>
  )
}
