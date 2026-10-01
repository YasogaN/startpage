// @vitest-environment jsdom
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../config/defaults'
import { clock } from '../store/clock'
import { settings, setSettings } from '../store/settings'
import SettingsPanel from './Settings'

const byText = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === text,
  )

function setValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
  event = 'input',
) {
  element.value = value
  element.dispatchEvent(new Event(event, { bubbles: true }))
}

function mount(open = true, onClose = vi.fn()) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => <SettingsPanel open={open} onClose={onClose} />,
    container,
  )
  return { container, dispose, onClose }
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  const defaults = structuredClone(DEFAULT_SETTINGS)
  setSettings('theme', defaults.theme)
  setSettings('engine', defaults.engine)
  setSettings('timeZone', defaults.timeZone)
  setSettings('syncTime', defaults.syncTime)
  setSettings('favicons', defaults.favicons)
  setSettings('suggestions', defaults.suggestions)
  setSettings('groups', defaults.groups)
})

describe('SettingsPanel', () => {
  it('renders nothing when closed', () => {
    const { container, dispose } = mount(false)
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    dispose()
  })

  it('edits groups and links', () => {
    setSettings('groups', [])
    const { container, dispose } = mount()

    expect(container.textContent).toContain('USING LOCAL SYSTEM TIME')

    byText(container, '+ ADD GROUP')!.click()
    expect(settings.groups).toHaveLength(1)

    byText(container, '+ ADD LINK')!.click()
    expect(settings.groups[0].links).toHaveLength(1)

    setValue(
      container.querySelector('input[aria-label="Group title"]') as HTMLInputElement,
      'News',
    )
    expect(settings.groups[0].title).toBe('News')

    setValue(
      container.querySelector('input[aria-label="Link label"]') as HTMLInputElement,
      'Site',
    )
    expect(settings.groups[0].links[0].label).toBe('Site')

    setValue(
      container.querySelector('input[aria-label="Link URL"]') as HTMLInputElement,
      'https://site.test',
    )
    expect(settings.groups[0].links[0].url).toBe('https://site.test')

    ;(
      container.querySelector(
        'button[aria-label="Remove link"]',
      ) as HTMLButtonElement
    ).click()
    expect(settings.groups[0].links).toHaveLength(0)

    byText(container, 'REMOVE GROUP')!.click()
    expect(settings.groups).toHaveLength(0)

    dispose()
  })

  it('changes engine and theme', () => {
    const { container, dispose } = mount()
    const [engine, theme] = container.querySelectorAll('select')

    setValue(engine as unknown as HTMLInputElement, 'ddg-noai', 'change')
    expect(settings.engine).toBe('ddg-noai')

    setValue(theme as unknown as HTMLInputElement, 'light', 'change')
    expect(settings.theme).toBe('light')

    dispose()
  })

  it('validates the timezone and toggles network time', () => {
    const { container, dispose } = mount()
    const zone = container.querySelector(
      'input[list="timezone-list"]',
    ) as HTMLInputElement

    setValue(zone, 'Europe/London', 'change')
    expect(settings.timeZone).toBe('Europe/London')

    setValue(zone, 'Not/AZone', 'change')
    expect(settings.timeZone).toBe('')

    setValue(zone, '', 'change')
    expect(settings.timeZone).toBe('')

    const checkbox = container.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement
    checkbox.click()
    expect(settings.syncTime).toBe(false)

    // The timezone datalist is populated.
    expect(
      container.querySelectorAll('#timezone-list option').length,
    ).toBeGreaterThan(0)

    dispose()
  })

  it('toggles favicons and suggestions', () => {
    const { container, dispose } = mount()
    const boxes = container.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    )
    expect(boxes).toHaveLength(3)

    boxes[1].click()
    expect(settings.favicons).toBe(false)

    boxes[2].click()
    expect(settings.suggestions).toBe(true)

    dispose()
  })

  it('syncs on demand and reports the source', async () => {
    let resolveFetch!: (value: Response) => void
    clock.configure({
      now: () => 0,
      fetchImpl: () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        }),
    })
    const { container, dispose } = mount()

    byText(container, 'SYNC NOW')!.click()
    await Promise.resolve()
    expect(container.textContent).toContain('SYNCING')

    resolveFetch({
      ok: true,
      text: async () => 'ts=1000.000',
    } as unknown as Response)
    await vi.waitFor(() =>
      expect(container.textContent).toContain('SYNCED VIA CLOUDFLARE'),
    )

    dispose()
  })

  it('exports settings into the textarea', () => {
    const { container, dispose } = mount()
    byText(container, 'EXPORT')!.click()

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea.value).toContain('"engine"')
    expect(container.textContent).toContain('Exported')

    dispose()
  })

  it('copies the export and reports clipboard failures', async () => {
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const { container, dispose } = mount()

    byText(container, 'EXPORT')!.click()
    byText(container, 'COPY')!.click()
    await Promise.resolve()
    expect(writeText).toHaveBeenCalled()
    expect(container.textContent).toContain('Copied to clipboard')

    writeText.mockRejectedValueOnce(new Error('denied'))
    byText(container, 'COPY')!.click()
    await Promise.resolve()
    expect(container.textContent).toContain('Copy failed')

    dispose()
  })

  it('downloads the export', () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    const { container, dispose } = mount()
    byText(container, 'EXPORT')!.click()
    byText(container, 'DOWNLOAD')!.click()

    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalled()

    dispose()
  })

  it('imports valid JSON and rejects invalid JSON', () => {
    const { container, dispose } = mount()
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement

    setValue(textarea, '{ broken')
    byText(container, 'IMPORT')!.click()
    expect(container.textContent).toContain('Import failed')

    setValue(
      textarea,
      JSON.stringify({ engine: 'ddg-noai', theme: 'light', groups: [] }),
    )
    byText(container, 'IMPORT')!.click()
    expect(settings.engine).toBe('ddg-noai')
    expect(settings.theme).toBe('light')
    expect(container.textContent).toContain('Imported')

    dispose()
  })

  it('imports browser bookmarks from a file', async () => {
    const { container, dispose } = mount()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [
        {
          text: async () =>
            '<DL><DT><H3>Dev</H3><DL><DT><A HREF="https://a.test/">A</A></DL>' +
            '<DT><A HREF="https://b.test/">B</A></DL>',
        },
      ],
    })
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await vi.waitFor(() =>
      expect(container.textContent).toContain('Imported 2 groups'),
    )
    expect(settings.groups[0].title).toBe('Dev')
    dispose()
  })

  it('uses the singular when one group is imported', async () => {
    const { container, dispose } = mount()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [
        {
          text: async () =>
            '<DL><DT><H3>Only</H3><DL><DT><A HREF="https://a.test/">A</A></DL></DL>',
        },
      ],
    })
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await vi.waitFor(() =>
      expect(container.textContent).toContain('Imported 1 group from bookmarks'),
    )
    dispose()
  })

  it('reports a bookmark file with no links', async () => {
    const { container, dispose } = mount()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [{ text: async () => '<html><body>empty</body></html>' }],
    })
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await vi.waitFor(() =>
      expect(container.textContent).toContain('No bookmarks found'),
    )
    dispose()
  })

  it('reports an unreadable bookmark file', async () => {
    const { container, dispose } = mount()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [
        {
          text: async () => {
            throw new Error('unreadable')
          },
        },
      ],
    })
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await vi.waitFor(() =>
      expect(container.textContent).toContain('Could not read'),
    )
    dispose()
  })

  it('does nothing when no bookmark file is chosen', () => {
    const { container, dispose } = mount()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', { configurable: true, value: [] })
    input.dispatchEvent(new Event('change', { bubbles: true }))

    expect(container.textContent).not.toContain('Imported')
    expect(container.textContent).not.toContain('bookmarks found')
    dispose()
  })

  it('resets only when confirmed', () => {
    setSettings('engine', 'ddg-noai')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { container, dispose } = mount()

    byText(container, 'RESET')!.click()
    expect(settings.engine).toBe('ddg-noai')

    confirm.mockReturnValue(true)
    byText(container, 'RESET')!.click()
    expect(settings.engine).toBe('ddg')
    expect(container.textContent).toContain('Reset to defaults')

    dispose()
  })

  it('moves focus into the dialog and restores it on close', async () => {
    const [open, setOpen] = createSignal(false)
    const container = document.createElement('div')
    document.body.appendChild(container)
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const dispose = render(
      () => <SettingsPanel open={open()} onClose={() => setOpen(false)} />,
      container,
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()

    setOpen(true)
    await Promise.resolve()
    const closeButton = byText(container, 'CLOSE')
    expect(document.activeElement).toBe(closeButton)

    setOpen(false)
    await Promise.resolve()
    expect(document.activeElement).toBe(trigger)

    dispose()
  })

  it('traps Tab inside the dialog', () => {
    const { container, dispose } = mount()
    const panel = container.querySelector('.panel') as HTMLElement
    panel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    )
    expect(panel).not.toBeNull()
    dispose()
  })

  it('closes from the overlay and close button but not from inside', () => {
    const { container, dispose, onClose } = mount()

    ;(container.querySelector('.panel') as HTMLElement).click()
    expect(onClose).not.toHaveBeenCalled()

    ;(container.querySelector('.overlay') as HTMLElement).click()
    expect(onClose).toHaveBeenCalledTimes(1)

    byText(container, 'CLOSE')!.click()
    expect(onClose).toHaveBeenCalledTimes(2)

    dispose()
  })
})
