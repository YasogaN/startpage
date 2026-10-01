import type { LinkGroup, LinkItem } from '../types'

function nextFolderList(dt: Element): Element | null {
  // Some exports nest the <DL> inside the <DT>; others put it right after.
  const nested = dt.querySelector(':scope > dl')
  if (nested) return nested

  let sibling = dt.nextElementSibling
  while (sibling && sibling.tagName !== 'DL') {
    sibling = sibling.nextElementSibling
  }
  return sibling
}

function collect(dl: Element, title: string, out: LinkGroup[]): void {
  const links: LinkItem[] = []

  for (const dt of Array.from(dl.children).filter((el) => el.tagName === 'DT')) {
    const folder = dt.querySelector('h3')
    if (folder) {
      const nested = nextFolderList(dt)
      if (nested) {
        collect(nested, folder.textContent?.trim() || title, out)
      }
      continue
    }

    const anchor = dt.querySelector('a[href]')
    if (!anchor) continue
    const url = anchor.getAttribute('href')
    if (!url) continue
    const label = (anchor.textContent || '').trim() || url
    links.push({ label, url })
  }

  if (links.length > 0) out.push({ title, links })
}

/**
 * Parse a Netscape bookmark export (Chrome/Firefox "Export bookmarks to HTML")
 * into link groups. Returns an empty array when no bookmarks are found.
 */
export function parseBookmarks(html: string): LinkGroup[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const root = doc.querySelector('dl')
  if (!root) return []

  const groups: LinkGroup[] = []
  collect(root, 'Imported', groups)
  return groups
}
