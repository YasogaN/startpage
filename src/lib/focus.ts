const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

/**
 * Keep Tab focus inside `root`. Returns `true` when the event was handled
 * (focus wrapped), so callers can decide whether to act.
 */
export function trapTabKey(event: KeyboardEvent, root: HTMLElement): boolean {
  if (event.key !== 'Tab') return false

  const focusable = getFocusableElements(root)
  if (focusable.length === 0) return false

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
    return true
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
    return true
  }
  return false
}
