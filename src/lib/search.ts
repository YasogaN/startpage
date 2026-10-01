import { ENGINES } from '../config/defaults'
import type { EngineId } from '../types'

/**
 * Build a search URL for the given engine. Returns `null` for blank input.
 *
 * DDG parses `!bang` tokens from the query itself, so bangs need no special
 * handling here — they are simply encoded along with the rest of the query and
 * decoded again by DuckDuckGo.
 */
export function buildSearchUrl(engine: EngineId, query: string): string | null {
  const trimmed = query.trim()
  if (!trimmed) return null
  return ENGINES[engine].url.replace('%s', encodeURIComponent(trimmed))
}

const SCHEME_LIKE = /^[a-z][a-z0-9+.-]*:\/\//i
const DOMAIN_LIKE = /^[\w-]+(\.[\w-]+)+(:\d+)?([/?#].*)?$/i
const LOCALHOST_LIKE = /^localhost(:\d+)?([/?#].*)?$/i

/**
 * Detect whether the raw input is a URL/domain rather than a search term.
 * Anything containing whitespace is treated as a query, which keeps `!bang`
 * and multi-word searches working.
 */
export function looksLikeUrl(input: string): boolean {
  const value = input.trim()
  if (!value || /\s/.test(value)) return false
  return SCHEME_LIKE.test(value) || DOMAIN_LIKE.test(value) || LOCALHOST_LIKE.test(value)
}

/** Coerce input into a navigable URL, or `null` if it is a search term. */
export function toUrl(input: string): string | null {
  const value = input.trim()
  if (!value) return null
  if (SCHEME_LIKE.test(value)) return value
  if (DOMAIN_LIKE.test(value) || LOCALHOST_LIKE.test(value)) return `https://${value}`
  return null
}
