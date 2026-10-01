import { For, Show, createEffect, createSignal } from 'solid-js'
import { produce } from 'solid-js/store'
import { parseBookmarks } from '../lib/bookmarks'
import { DEFAULT_SETTINGS, ENGINES, ENGINE_ORDER } from '../config/defaults'
import { getFocusableElements, trapTabKey } from '../lib/focus'
import { exportSettings, parseImport } from '../lib/storage'
import { detectedTimeZone, isValidTimeZone, listTimeZones } from '../lib/time'
import { clock } from '../store/clock'
import { settings, setSettings } from '../store/settings'
import type { EngineId, LinkGroup, ThemeMode } from '../types'

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
    anchor.download = 'startpage-settings.json'
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
                    checked={settings.favicons}
                    onChange={(event) =>
                      setSettings('favicons', event.currentTarget.checked)
                    }
                  />
                  <span>SHOW FAVICONS</span>
                </span>
              </label>

              <label class="field">
                <span>SEARCH SUGGESTIONS</span>
                <span class="check">
                  <input
                    type="checkbox"
                    checked={settings.suggestions}
                    onChange={(event) =>
                      setSettings('suggestions', event.currentTarget.checked)
                    }
                  />
                  <span>ENABLE SUGGESTIONS</span>
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
          </div>
        </div>
      </div>
    </Show>
  )
}
