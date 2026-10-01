import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The CSP keeps `script-src` at 'self'. That means any inline <script> would be
 * blocked, so the pre-paint theme bootstrap must stay external.
 */
describe('Content-Security-Policy', () => {
  it('does not rely on inline scripts', () => {
    const html = readFileSync('index.html', 'utf8')
    expect(html).not.toMatch(/<script>[\s\S]*?<\/script>/)
    expect(html).toContain('src="/theme-boot.js"')
  })

  it('restricts scripts, connections and framing', () => {
    const headers = readFileSync('public/_headers', 'utf8')
    expect(headers).toContain("script-src 'self'")
    expect(headers).toContain('https://one.one.one.one')
    expect(headers).toContain('https://timeapi.io')
    expect(headers).toContain("frame-ancestors 'none'")
  })
})
