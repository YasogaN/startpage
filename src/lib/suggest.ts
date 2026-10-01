import type { LinkItem } from '../types'

export interface Suggestion {
  label: string
  /** Present when the suggestion points at a saved link. */
  url?: string
}

/**
 * On-device suggestions: matching saved links plus matching recent searches.
 * This needs no network and no proxy — the browser cannot read DuckDuckGo's
 * autocomplete cross-origin (no CORS, no JSONP), so this is the unproxied
 * alternative.
 */
export function localSuggestions(
  query: string,
  recent: string[],
  links: LinkItem[],
  limit = 6,
): Suggestion[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []

  const out: Suggestion[] = []
  const seen = new Set<string>()

  for (const link of links) {
    const matched =
      link.label.toLowerCase().includes(needle) ||
      link.url.toLowerCase().includes(needle)
    const key = link.label.toLowerCase()
    if (matched && !seen.has(key)) {
      seen.add(key)
      out.push({ label: link.label, url: link.url })
    }
  }

  for (const term of recent) {
    const key = term.toLowerCase()
    if (key.includes(needle) && !seen.has(key)) {
      seen.add(key)
      out.push({ label: term })
    }
  }

  return out.slice(0, limit)
}
