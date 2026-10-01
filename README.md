# START

A minimalist **brutalist** startpage — pure black/white with a red accent, no
border-radius, hard shadows. Built with SolidJS + Vite, compiled to a static
bundle, and installable/offline via a service worker.

- **Search:** DuckDuckGo (default) and DuckDuckGo No-AI, with native `!bangs`.
  Bare domains navigate directly.
- **Links:** monogram tiles (no external favicon requests — nothing leaks), plus
  import of browser bookmark HTML exports.
- **Settings:** edit links, import/export JSON, import bookmarks, engine, theme
  and time; reset.
- **Theme:** dark, light, or follow the system (`prefers-color-scheme`).
- **Privacy:** no telemetry and no external fonts. The only outbound request is
  the optional network-time sync.
- **Offline:** the entire app shell is precached by Workbox; new versions prompt
  before reloading.
- **Security:** strict Content-Security-Policy via Cloudflare `_headers`.

## Development

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # logic + DOM component tests
pnpm coverage   # same, with 100% thresholds enforced
pnpm build      # tsc -b && vite build  ->  dist/
pnpm preview    # serve the built output
```

## Configuration

Default links and search engines live in `src/config/defaults.ts`. Everything
can also be changed at runtime from the in-app **SETTINGS** panel, which
persists to `localStorage` and supports JSON import/export and browser bookmark
HTML import.

## Network time

Browsers can't use NTP (no UDP sockets), so the clock syncs over HTTPS against
Cloudflare's `/cdn-cgi/trace` (with timeapi.io as fallback) and stores the
difference between network and local time. The offset is cached, so the clock
keeps working offline.

This corrects an inaccurate or fuzzed system clock. Because fingerprint-
resistant browsers (LibreWolf, Firefox RFP, etc.) report the timezone as **UTC**,
the IANA timezone is a setting — the clock formats using an explicit zone, so
you get your real local time. Change it, disable syncing, or force a sync in
**SETTINGS**.

## Deploy to Cloudflare Pages

| Setting | Value |
| --- | --- |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Node version | 22+ |

`public/_headers` ships with the build and sets a strict Content-Security-Policy,
immutable caching for `/assets/*`, and `no-cache` for `/sw.js`, `/index.html`
and the manifest, so service-worker updates are picked up immediately.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | focus search |
| `Enter` | submit search |
| `Alt`+`1` / `Alt`+`2` | DDG / DDG No-AI |
| `t` | cycle theme (dark → light → system) |
| `Esc` | blur / close settings |

## How offline caching works

`vite-plugin-pwa` (Workbox `generateSW`, `registerType: 'autoUpdate'`) precaches
every build asset, including `index.html`, so the startpage loads with no
network after the first visit. A new build is detected in the background and
prompted on screen before reloading. To verify: `pnpm build && pnpm preview`,
load the page once, then go offline in DevTools and reload.

## Quality

`pnpm coverage` enforces **100%** statements, branches, functions and lines.
CI (`.github/workflows/ci.yml`) runs coverage and the production build on every
push and pull request.
