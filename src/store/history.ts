import { createRoot, createSignal } from 'solid-js'

const KEY = 'startpage.history.v1'
const MAX = 8

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

function write(entries: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    // Storage unavailable — history still works for this session.
  }
}

/** Recent searches, used for on-device (unproxied) suggestions. */
export const history = createRoot(() => {
  const [recent, setRecent] = createSignal<string[]>(read())

  const remember = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    setRecent((current) => {
      const next = [trimmed, ...current.filter((item) => item !== trimmed)].slice(
        0,
        MAX,
      )
      write(next)
      return next
    })
  }

  return { recent, remember }
})
