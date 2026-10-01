import { For, Show, createEffect, createSignal } from 'solid-js'
import { produce } from 'solid-js/store'
import { parseBookmarks } from '../lib/bookmarks'
import { clearFaviconCache } from '../lib/cache'
import { DEFAULT_SETTINGS, ENGINES, ENGINE_ORDER } from '../config/defaults'
import { getFocusableElements, trapTabKey } from '../lib/focus'
import { exportSettings, parseImport } from '../lib/storage'
import { detectedTimeZone, isValidTimeZone, listTimeZones } from '../lib/time'
import { clock } from '../store/clock'
import { settings, setSettings } from '../store/settings'
import { statusLabel, weather } from '../store/weather'
import type { EngineId, LinkGroup, TemperatureUnit, ThemeMode } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SettingsPanel(props: Props) {
  const [draft, setDraft] = createSignal('')
  const [status, setStatus] = createSignal('')
  const zones = listTimeZones()
  let panelEl: HTMLDivElement | undefined
  let previousFocus: HTMLElement | null = null

  // Move focus into the dialog on open and restore it on close.
  createEffect(() => {
    if (props.open) {
      previousFocus = document.activeElement as HTMLElement | null
      getFocusableElements(panelEl!)[0].focus()
    } else if (previousFocus) {
      previousFocus.focus()
      previousFocus = null
    }
  })

  const setTimeZone = (value: string) => {
    const trimmed = value.trim()
    setSettings(
      'timeZone',
      trimmed === '' || isValidTimeZone(trimmed) ? trimmed : '',
    )
  }

  const setCoordinate = (key: 'latitude' | 'longitude', raw: string) => {
    const trimmed = raw.trim()
    const parsed = trimmed === '' ? null : Number(trimmed)
    setSettings(
      'weather',
      key,
      parsed !== null && Number.isFinite(parsed) ? parsed : null,
    )
  }

  const weatherStatus = () => {
    if (weather.locating()) return 'LOCATING…'
    return statusLabel(weather.status())
  }

  const clearIconCache = async () => {
    const cleared = await clearFaviconCache()
    setStatus(cleared ? 'Icon cache cleared.' : 'No icon cache to clear.')
  }

  const clearWeatherCache = () => {
    weather.clear()
    setStatus('Weather cache cleared.')
  }

  const clearClockOffset = () => {
    clock.clear()
    setStatus('Clock offset cleared.')
  }

  const mutateGroups = (fn: (groups: LinkGroup[]) => void) =>
    setSettings('groups', produce(fn))

  const addGroup = () =>
    mutateGroups((groups) => {
      groups.push({ title: 'NEW GROUP', links: [] })
    })

  const removeGroup = (index: number) =>
    mutateGroups((groups) => {
      groups.splice(index, 1)
    })

  const addLink = (index: number) =>
    setSettings(
      'groups',
      index,
      'links',
      produce((links) => {
        links.push({ label: 'NEW LINK', url: 'https://' })
      }),
    )

  const removeLink = (groupIndex: number, linkIndex: number) =>
    setSettings(
      'groups',
      groupIndex,
      'links',
      produce((links) => {
        links.splice(linkIndex, 1)
      }),
    )

  const doExport = () => {
    setDraft(exportSettings(JSON.parse(JSON.stringify(settings))))
    setStatus('Exported to the box below.')
  }

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(draft())
      setStatus('Copied to clipboard.')
    } catch {
      setStatus('Copy failed — select the text and copy manually.')
    }
  }

  const download = () => {
    const blob = new Blob([draft()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'new-tab-settings.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const doImport = () => {
    const parsed = parseImport(draft())
    if (!parsed) {
      setStatus('Import failed: invalid JSON.')
      return
    }
    setSettings('theme', parsed.theme)
    setSettings('engine', parsed.engine)
    setSettings('groups', parsed.groups)
    setStatus('Imported.')
  }

  const importBookmarks = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      const groups = parseBookmarks(await file.text())
      if (groups.length === 0) {
        setStatus('No bookmarks found in that file.')
        return
      }
      setSettings('groups', groups)
      setStatus(
        `Imported ${groups.length} group${groups.length === 1 ? '' : 's'} from bookmarks.`,
      )
    } catch {
      setStatus('Could not read that file.')
    } finally {
      input.value = ''
    }
  }

  const reset = () => {
    if (!window.confirm('Reset all links and preferences to defaults?')) return
    const defaults = structuredClone(DEFAULT_SETTINGS)
    setSettings('theme', defaults.theme)
    setSettings('engine', defaults.engine)
    setSettings('groups', defaults.groups)
    setStatus('Reset to defaults.')
  }

  return (
    <Show when={props.open}>
      <div class="overlay" onClick={props.onClose}>
        <div
          ref={(el) => {
            panelEl = el
          }}
          class="panel"
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            trapTabKey(event, panelEl!)
          }}
        >
          <div class="panel-head">
            <h2>SETTINGS</h2>
            <button type="button" class="btn" onClick={props.onClose}>
              CLOSE
            </button>
          </div>

          <div class="panel-body">
            <div class="row">
              <label class="field">
                <span>DEFAULT ENGINE</span>
                <select
                  class="input"
                  aria-label="Default engine"
                  value={settings.engine}
                  onChange={(event) =>
                    setSettings('engine', event.currentTarget.value as EngineId)
                  }
                >
                  <For each={ENGINE_ORDER}>
                    {(id) => <option value={id}>{ENGINES[id].label}</option>}
                  </For>
                </select>
              </label>

              <label class="field">
                <span>THEME</span>
                <select
                  class="input"
                  aria-label="Theme"
                  value={settings.theme}
                  onChange={(event) =>
                    setSettings('theme', event.currentTarget.value as ThemeMode)
                  }
                >
                  <option value="dark">DARK</option>
                  <option value="light">LIGHT</option>
                  <option value="system">SYSTEM</option>
                </select>
              </label>
            </div>

            <div class="row">
              <label class="field">
                <span>TIME ZONE</span>
                <input
                  class="input"
                  aria-label="Time zone"
                  list="timezone-list"
                  value={settings.timeZone}
                  placeholder={`AUTO (${detectedTimeZone()})`}
                  onChange={(event) => setTimeZone(event.currentTarget.value)}
                />
              </label>

              <label class="field">
                <span>NETWORK TIME</span>
                <span class="check">
                  <input
                    type="checkbox"
                    aria-label="Sync clock"
                    checked={settings.syncTime}
                    onChange={(event) =>
                      setSettings('syncTime', event.currentTarget.checked)
                    }
                  />
                  <span>SYNC CLOCK</span>
                </span>
              </label>
            </div>

            <div class="row">
              <label class="field">
                <span>LINK ICONS</span>
                <span class="check">
                  <input
                    type="checkbox"
                    aria-label="Show favicons"
                    checked={settings.favicons}
                    onChange={(event) =>
                      setSettings('favicons', event.currentTarget.checked)
                    }
                  />
                  <span>SHOW FAVICONS</span>
                </span>
              </label>
            </div>

            <div class="row">
              <label class="field">
                <span>CLOCK FORMAT</span>
                <span class="check">
                  <input
                    type="checkbox"
                    aria-label="24-hour clock"
                    checked={settings.clock24}
                    onChange={(event) =>
                      setSettings('clock24', event.currentTarget.checked)
                    }
                  />
                  <span>24-HOUR</span>
                </span>
              </label>

              <label class="field">
                <span>SECONDS</span>
                <span class="check">
                  <input
                    type="checkbox"
                    aria-label="Show seconds"
                    checked={settings.showSeconds}
                    onChange={(event) =>
                      setSettings('showSeconds', event.currentTarget.checked)
                    }
                  />
                  <span>SHOW SECONDS</span>
                </span>
              </label>
            </div>

            <div class="row-buttons">
              <button
                type="button"
                class="btn"
                onClick={() => void clock.sync(true)}
              >
                SYNC NOW
              </button>
              <span class="status-line">
                {clock.syncing()
                  ? 'SYNCING…'
                  : clock.source() === 'local'
                    ? 'USING LOCAL SYSTEM TIME'
                    : `SYNCED VIA ${clock.source().toUpperCase()}`}
              </span>
            </div>

            <datalist id="timezone-list">
              <For each={zones}>{(zone) => <option value={zone} />}</For>
            </datalist>

            <h3>WEATHER</h3>
            <div class="row">
              <label class="field">
                <span>SHOW WEATHER</span>
                <span class="check">
                  <input
                    type="checkbox"
                    aria-label="Show weather"
                    checked={settings.weather.enabled}
                    onChange={(event) =>
                      setSettings(
                        'weather',
                        'enabled',
                        event.currentTarget.checked,
                      )
                    }
                  />
                  <span>ENABLED</span>
                </span>
              </label>

              <label class="field">
                <span>UNITS</span>
                <select
                  class="input"
                  aria-label="Weather units"
                  value={settings.weather.unit}
                  onChange={(event) =>
                    setSettings(
                      'weather',
                      'unit',
                      event.currentTarget.value as TemperatureUnit,
                    )
                  }
                >
                  <option value="celsius">CELSIUS</option>
                  <option value="fahrenheit">FAHRENHEIT</option>
                </select>
              </label>
            </div>

            <div class="row">
              <label class="field">
                <span>LATITUDE</span>
                <input
                  class="input"
                  type="number"
                  step="any"
                  aria-label="Latitude"
                  value={settings.weather.latitude ?? ''}
                  onChange={(event) =>
                    setCoordinate('latitude', event.currentTarget.value)
                  }
                />
              </label>

              <label class="field">
                <span>LONGITUDE</span>
                <input
                  class="input"
                  type="number"
                  step="any"
                  aria-label="Longitude"
                  value={settings.weather.longitude ?? ''}
                  onChange={(event) =>
                    setCoordinate('longitude', event.currentTarget.value)
                  }
                />
              </label>
            </div>

            <div class="row">
              <label class="field">
                <span>PLACE NAME</span>
                <input
                  class="input"
                  aria-label="Place name"
                  value={settings.weather.label}
                  placeholder="Optional"
                  onInput={(event) =>
                    setSettings('weather', 'label', event.currentTarget.value)
                  }
                />
              </label>

              <div class="field">
                <span>LOCATION</span>
                <div class="row-buttons">
                  <button
                    type="button"
                    class="btn"
                    onClick={() => void weather.useCurrentLocation()}
                  >
                    USE MY LOCATION
                  </button>
                  <span class="status-line">{weatherStatus()}</span>
                </div>
              </div>
            </div>

            <h3>LINKS</h3>
            <For each={settings.groups}>
              {(group, groupIndex) => (
                <div class="group-edit">
                  <div class="group-edit-head">
                    <input
                      class="input"
                      value={group.title}
                      aria-label="Group title"
                      onInput={(event) =>
                        setSettings(
                          'groups',
                          groupIndex(),
                          'title',
                          event.currentTarget.value,
                        )
                      }
                    />
                    <button
                      type="button"
                      class="btn danger"
                      onClick={() => removeGroup(groupIndex())}
                    >
                      REMOVE GROUP
                    </button>
                  </div>

                  <For each={group.links}>
                    {(link, linkIndex) => (
                      <div class="link-edit">
                        <input
                          class="input"
                          value={link.label}
                          placeholder="label"
                          aria-label="Link label"
                          onInput={(event) =>
                            setSettings(
                              'groups',
                              groupIndex(),
                              'links',
                              linkIndex(),
                              'label',
                              event.currentTarget.value,
                            )
                          }
                        />
                        <input
                          class="input"
                          value={link.url}
                          placeholder="https://"
                          aria-label="Link URL"
                          onInput={(event) =>
                            setSettings(
                              'groups',
                              groupIndex(),
                              'links',
                              linkIndex(),
                              'url',
                              event.currentTarget.value,
                            )
                          }
                        />
                        <button
                          type="button"
                          class="btn danger"
                          aria-label="Remove link"
                          onClick={() => removeLink(groupIndex(), linkIndex())}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </For>

                  <button
                    type="button"
                    class="btn"
                    onClick={() => addLink(groupIndex())}
                  >
                    + ADD LINK
                  </button>
                </div>
              )}
            </For>

            <button type="button" class="btn" onClick={addGroup}>
              + ADD GROUP
            </button>

            <h3>IMPORT / EXPORT</h3>
            <label class="field">
              <span>IMPORT BROWSER BOOKMARKS (.html)</span>
              <input
                class="input"
                type="file"
                accept=".html,text/html"
                onChange={importBookmarks}
              />
            </label>
            <textarea
              class="input textarea"
              rows="8"
              value={draft()}
              aria-label="Settings JSON"
              placeholder="Paste settings JSON here and press IMPORT, or press EXPORT to fill this box."
              onInput={(event) => setDraft(event.currentTarget.value)}
            />
            <div class="row-buttons">
              <button type="button" class="btn" onClick={doExport}>
                EXPORT
              </button>
              <button type="button" class="btn" onClick={copyExport}>
                COPY
              </button>
              <button type="button" class="btn" onClick={download}>
                DOWNLOAD
              </button>
              <button type="button" class="btn" onClick={doImport}>
                IMPORT
              </button>
              <button type="button" class="btn danger" onClick={reset}>
                RESET
              </button>
            </div>
            <Show when={status()}>
              <p class="status" role="status">
                {status()}
              </p>
            </Show>

            <h3>CACHES</h3>
            <div class="row-buttons">
              <button
                type="button"
                class="btn"
                onClick={() => void clearIconCache()}
              >
                CLEAR ICONS
              </button>
              <button type="button" class="btn" onClick={clearWeatherCache}>
                CLEAR WEATHER
              </button>
              <button type="button" class="btn" onClick={clearClockOffset}>
                CLEAR CLOCK
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  )
}
