import type { ThemeMode } from '../types'

export type EffectiveTheme = 'dark' | 'light'

export const DARK_QUERY = '(prefers-color-scheme: dark)'

export interface MediaQueryEventLike {
  matches: boolean
}

export interface MediaQueryLike {
  matches: boolean
  addEventListener?: (
    type: 'change',
    listener: (event: MediaQueryEventLike) => void,
  ) => void
  removeEventListener?: (
    type: 'change',
    listener: (event: MediaQueryEventLike) => void,
  ) => void
  addListener?: (listener: (event: MediaQueryEventLike) => void) => void
  removeListener?: (listener: (event: MediaQueryEventLike) => void) => void
}

export type MatchMediaLike = (query: string) => MediaQueryLike

export function ambientMatchMedia(): MatchMediaLike | undefined {
  return typeof globalThis.matchMedia === 'function'
    ? globalThis.matchMedia.bind(globalThis)
    : undefined
}

/** Whether the OS currently prefers a dark color scheme. Defaults to dark. */
export function systemPrefersDark(
  matchMediaImpl: MatchMediaLike | undefined = ambientMatchMedia(),
): boolean {
  if (!matchMediaImpl) return true
  try {
    return matchMediaImpl(DARK_QUERY).matches
  } catch {
    return true
  }
}

/** Collapse a stored theme mode plus the system preference into dark/light. */
export function resolveTheme(
  mode: ThemeMode,
  systemDark: boolean,
): EffectiveTheme {
  if (mode === 'system') return systemDark ? 'dark' : 'light'
  return mode
}

/**
 * Subscribe to system color-scheme changes. Supports both the modern
 * `addEventListener` and the legacy `addListener` APIs. Returns an unsubscribe
 * function that is always safe to call.
 */
export function subscribeSystemTheme(
  matchMediaImpl: MatchMediaLike | undefined,
  listener: (dark: boolean) => void,
): () => void {
  if (!matchMediaImpl) return () => {}

  let query: MediaQueryLike
  try {
    query = matchMediaImpl(DARK_QUERY)
  } catch {
    return () => {}
  }

  const handler = (event: MediaQueryEventLike) => listener(event.matches)

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handler)
    return () => query.removeEventListener?.('change', handler)
  }
  if (typeof query.addListener === 'function') {
    query.addListener(handler)
    return () => query.removeListener?.(handler)
  }
  return () => {}
}
