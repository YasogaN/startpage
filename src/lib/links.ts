const ICON_HOST = 'https://icons.duckduckgo.com/ip3'

/** First alphanumeric character of a label, uppercased. */
export function monogram(label: string): string {
  const match = label.trim().match(/[a-z0-9]/i)
  return match ? match[0].toUpperCase() : '?'
}

/** Bare hostname for display, or the raw value when it is not a valid URL. */
export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * DuckDuckGo's icon service. Keyless, no CORS needed for <img>, and keeps the
 * request on a single host we already trust (matching the search engines).
 */
export function faviconUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host ? `${ICON_HOST}/${host}.ico` : null
  } catch {
    return null
  }
}
