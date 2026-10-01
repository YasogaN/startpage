import { For } from 'solid-js'
import { settings } from '../store/settings'

/** First alphanumeric character of a label, uppercased. */
function monogram(label: string): string {
  const match = label.trim().match(/[a-z0-9]/i)
  return match ? match[0].toUpperCase() : '?'
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export default function QuickLinks() {
  return (
    <div class="links">
      <For each={settings.groups}>
        {(group) => (
          <section class="group">
            <h2 class="group-title">{group.title}</h2>
            <ul class="tiles">
              <For each={group.links}>
                {(link) => (
                  <li>
                    <a class="tile" href={link.url}>
                      <span class="mono" aria-hidden="true">
                        {monogram(link.label)}
                      </span>
                      <span class="tile-text">
                        <span class="tile-label">{link.label}</span>
                        <span class="tile-host">{host(link.url)}</span>
                      </span>
                    </a>
                  </li>
                )}
              </For>
            </ul>
          </section>
        )}
      </For>
    </div>
  )
}
