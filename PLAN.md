# Startpage — Plan

A minimalist **brutalist** startpage: pure black/white, one red accent, no
border-radius, thick rules, hard offset shadows. Compiles to a fully static
bundle and deploys to Cloudflare Pages with a service worker that precaches
everything for offline use.

## Locked decisions

| Area | Decision |
| --- | --- |
| Stack | SolidJS + Vite + TypeScript (static `dist/`) |
| Aesthetic | Minimalist brutalism — `#000` / `#fff`, dark red `#8b0000`, IBM Plex Mono, 0 radius, 2–4px rules, hard shadows, uppercase labels |
| Icons | DuckDuckGo favicon service on a neutral chip (so opaque brand icons stay legible); monogram fallback |
| Weather | Opt-in Open-Meteo reading (keyless, CORS) via browser geolocation or manual coordinates |
| Search | DuckDuckGo (initial default) + DuckDuckGo No-AI, visible segmented toggle |
| Search URLs | `https://duckduckgo.com/?q=%s` and `https://noai.duckduckgo.com/?q=%s` |
| Bangs | Passthrough — DDG parses `!bang` from the query, no client work |
| Links | File-seeded defaults → runtime editable → `localStorage` → JSON import/export → reset |
| Deploy | Cloudflare Pages + Workbox service worker (`autoUpdate`) |
| Time | Network time via **HTTPS** (real NTP is impossible in a browser) + user-overridable IANA timezone |
| Tests | 100% statements / branches / functions / lines (enforced) |
| Weather | **Cut** — external API, clutter, anti-minimal |
| Backgrounds | None external. Solid color + system font stack only |

## Architecture

```
src/
  index.tsx              entry
  App.tsx                layout shell + global keyboard shortcuts
  types.ts               Settings / Engine / LinkGroup types
  config/defaults.ts     default engine + link groups (versioned in git)
  lib/search.ts          engine table, URL builder, URL-vs-query detection
  lib/storage.ts         load/save/merge/validate/import/export
  lib/time.ts            HTTPS time parsing, offsets, timezone helpers
  lib/theme.ts           system color-scheme preference + resolution
  lib/focus.ts           focusable query + Tab containment
  lib/bookmarks.ts       Netscape bookmark HTML import
  lib/links.ts           monogram + hostname + favicon URL helpers
  lib/weather.ts         Open-Meteo URL/parse + WMO code descriptions
  store/settings.ts       Solid store, persisted
  store/clock.ts          network-corrected clock, cached offset
  store/weather.ts        geolocation + cached weather reading
  store/pwa.ts            service-worker update state
  components/
    SearchBar.tsx         input + submit + engine toggle
    QuickLinks.tsx        one column per group of icon/monogram tiles
    Clock.tsx             live clock + date + greeting
    Weather.tsx           current temperature + conditions
    ThemeToggle.tsx       cycles dark / light / system
    UpdateBanner.tsx      "new version" prompt -> reload
    Settings.tsx          edit links, import/export, bookmarks, reset
  styles/
    tokens.css            CSS custom properties, light/dark, fonts
    app.css               component styles
```

## Service worker strategy

- `vite-plugin-pwa`, `registerType: 'autoUpdate'`, Workbox `generateSW`.
- Precache **all** build output via `globPatterns` → fully offline after first load.
- `navigateFallback: '/index.html'`, `cleanupOutdatedCaches`, `clientsClaim`, `skipWaiting`.
- New builds install in the background; `UpdateBanner` asks before reloading, so
  an in-progress interaction is never interrupted.
- Cloudflare Pages `public/_headers`: immutable long-cache for `/assets/*`,
  `no-cache` for `/sw.js`, `/index.html`, `/manifest.webmanifest`.
- A service worker requires HTTPS; Pages provides it.

## Privacy

- No Google services, no external fonts (IBM Plex Mono is self-hosted), no telemetry.
- Outbound requests are limited to: optional network-time sync
  (`one.one.one.one`), link favicons (`icons.duckduckgo.com`), and — only when
  weather is enabled — Open-Meteo. All are listed in the CSP `connect-src`.
- Link tiles fall back to **monogram letters** when favicons are off, so nothing
  leaks and everything still works offline.

## Network time (not NTP)

Browsers cannot open UDP sockets, so a static page cannot speak NTP (port 123).
Instead we sample an HTTPS endpoint and store the **offset** between network
time and the local clock:

- Sources: Cloudflare `one.one.one.one/cdn-cgi/trace` (`ts=`), then
  `timeapi.io` as fallback. Both are CORS-open.
- The offset is cached in `localStorage` and reused, so the clock still works
  offline; it re-syncs when older than an hour (and every 30 minutes).
- This corrects a wrong/fuzzed system clock. It does **not** fix a spoofed
  timezone — fingerprint-resistant browsers report UTC — so the IANA timezone
  is a user setting (defaulting to the detected zone) and the clock formats
  with an explicit `timeZone`.
- Sync can be disabled (`syncTime`) and forced from settings.

## Hardening & UX

- **CSP** (`public/_headers`): `script-src 'self'`, `object-src 'none'`,
  `frame-ancestors 'none'`, and `connect-src` limited to the two time endpoints.
  The pre-paint theme bootstrap is an external `public/theme-boot.js`, so no
  inline-script hash is needed (and a test guards against reintroducing one).
- **Theme**: cycles dark → light → system; `system` follows `prefers-color-scheme`.
- **a11y**: the settings dialog traps Tab and restores focus on close; the clock
  exposes `role="timer"` with an accessible label; reduced motion is respected.
- **Bookmark import**: Netscape/Firefox/Chrome HTML exports become link groups.
- **Weather (opt-in)**: uses the browser geolocation prompt, or manual
  latitude/longitude, then Open-Meteo (keyless, CORS). The reading is cached so
  it survives a reload offline. There is no search autocomplete: DuckDuckGo's
  suggestions have no CORS and no JSONP, so it was removed rather than proxied.
- **CI**: `.github/workflows/ci.yml` runs `pnpm coverage` + `pnpm build` on pushes
  and pull requests.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | focus search |
| `Esc` | blur / close settings |
| `Alt+1` / `Alt+2` | select DDG / DDG No-AI |
| `t` | cycle theme (dark → light → system) |
| `Enter` | submit search |

## Build order

1. Tokens + brutalist global styles
2. Search lib + unit tests
3. Settings store + persistence
4. Components
5. App shell + shortcuts
6. PWA (manifest, icons, SW, `_headers`)
7. Responsive / a11y / reduced-motion pass
8. Build + offline verification

## Verification

- `pnpm test` — logic, store, and DOM component tests (192 tests, 21 files).
- `pnpm coverage` — enforces **100%** statements / branches / functions / lines.
- `pnpm build` — typecheck + static bundle.
- `pnpm preview` — manual load, then reload offline (DevTools → Network → Offline) to confirm the SW served the app.

## Out of scope (possible phase 2)

Multiple link workspaces/pages, custom backgrounds, command palette, Cloudflare
Pages auto-deploy workflow.
