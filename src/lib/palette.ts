import type { LinkItem } from '../types'

/**
 * Rank links for the command palette. Label matches beat URL matches, and an
 * empty query lists the first `limit` links. Ties keep their original order.
 */
export function rankLinks(
  links: LinkItem[],
  query: string,
  limit = 8,
): LinkItem[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return links.slice(0, limit)

  const matches: { link: LinkItem; score: number }[] = []
  for (const link of links) {
    const label = link.label.toLowerCase()
    const url = link.url.toLowerCase()
    let score = -1
    if (label.startsWith(needle)) score = 0
    else if (label.includes(needle)) score = 1
    else if (url.includes(needle)) score = 2
    if (score >= 0) matches.push({ link, score })
  }

  matches.sort((a, b) => a.score - b.score)
  return matches.slice(0, limit).map((match) => match.link)
}
