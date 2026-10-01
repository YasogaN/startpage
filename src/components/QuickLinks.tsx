import { For, Show, createSignal } from 'solid-js'
import { faviconUrl, hostnameOf, monogram } from '../lib/links'
import { settings } from '../store/settings'
import type { LinkItem } from '../types'

function Tile(props: { link: LinkItem }) {
  const [failed, setFailed] = createSignal(false)
  const icon = () =>
    settings.favicons && !failed() ? faviconUrl(props.link.url) : null

  return (
    <li>
      <a class="tile" href={props.link.url}>
        <span class="tile-icon">
          <Show
            when={icon()}
            fallback={
              <span class="mono" aria-hidden="true">
                {monogram(props.link.label)}
              </span>
            }
          >
            <img
              class="favicon"
              src={icon()!}
              alt=""
              width="24"
              height="24"
              loading="lazy"
              onError={() => setFailed(true)}
            />
          </Show>
        </span>
        <span class="tile-text">
          <span class="tile-label">{props.link.label}</span>
          <span class="tile-host">{hostnameOf(props.link.url)}</span>
        </span>
      </a>
    </li>
  )
}

export default function QuickLinks() {
  return (
    <div class="links">
      <For each={settings.groups}>
        {(group) => (
          <section class="group">
            <h2 class="group-title">{group.title}</h2>
            <ul class="tiles">
              <For each={group.links}>{(link) => <Tile link={link} />}</For>
            </ul>
          </section>
        )}
      </For>
    </div>
  )
}
