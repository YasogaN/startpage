# Startpage

A minimalist **brutalist** startpage — pure black/white with a red accent, no
border-radius, hard shadows. Built with SolidJS + Vite, compiled to a static
bundle, and installable/offline via a service worker.

- **Search:** DuckDuckGo (default) and DuckDuckGo No-AI, with native `!bangs`.
  Bare domains navigate directly.
- **Links:** one column per group. Favicons come from DuckDuckGo's icon service
  and sit on a neutral chip so they read in both themes (with a monogram
  fallback); browser bookmark HTML exports can be imported.
- **Keyboard-first:** `/` focuses search; `Ctrl`/`Cmd`+`K` opens a local command
  palette that fuzzy-searches your links.
- **Weather:** optional current conditions via Open-Meteo, using your browser
  location or manual coordinates; includes feels-like, wind and a day/night
  glyph.
- **Settings:** edit links, import/export JSON, import bookmarks, engine, theme,
  time and weather; reset.
- **Theme:** dark, light, or follow the system (`prefers-color-scheme`).
- **Privacy:** no telemetry, no external fonts (IBM Plex Mono is self-hosted).
  The only outbound requests are optional clock sync, link favicons, and —
  only if you enable it — weather.
- **Offline:** the entire app shell is precached by Workbox; new versions prompt
  before reloading, and an `OFFLINE` badge appears when the network drops.
- **Security:** strict Content-Security-Policy via Cloudflare `_headers`.

## Usage

- **Hosted:** open <https://startpage.yasogan.dev> — and optionally set it as your
  browser's new tab (see [Set as your new tab](#set-as-your-new-tab)).
- **Self-hosted:** build the static bundle and deploy it yourself (see
  [Deploy your own](#deploy-your-own)). Any static host works.

## Project layout

```
src/
  index.tsx              entry
  App.tsx                layout shell + global keyboard shortcuts
  types.ts               shared types (Settings / Engine / LinkGroup / …)
  config/defaults.ts     default engine + link groups (versioned in git)
  lib/
    search.ts            engine table, URL builder, URL-vs-query detection
    storage.ts           load/save/merge/validate/import/export
    time.ts              HTTPS time parsing, offsets, timezone helpers
    theme.ts             system color-scheme preference + resolution
    focus.ts             focusable selector + Tab containment
    bookmarks.ts         Netscape bookmark HTML import
    links.ts             monogram + hostname + favicon URL helpers
    palette.ts           link ranking for the command palette
    cache.ts             clear the service-worker favicon cache
    weather.ts           Open-Meteo URL/parse + WMO codes + reverse geocoding
  store/                 Solid stores: settings, clock, weather, pwa
  components/            SearchBar, CommandPalette, QuickLinks, Clock,
                         Weather, ThemeToggle, UpdateBanner, Settings
  styles/                tokens.css + app.css
```

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

## Weather

Weather is **off by default**. Turn it on in **SETTINGS → WEATHER**, then either
press **USE MY LOCATION** (browser geolocation prompt) or enter a latitude and
longitude manually. Data comes from [Open-Meteo](https://open-meteo.com) — no
API key, CORS-open — and the last reading is cached so something still shows
offline. If no place name is set, coordinates are reverse-geocoded once via
BigDataCloud. Coordinates are stored only in your own `localStorage`.

There is intentionally **no search autocomplete**: DuckDuckGo's suggestions send
no CORS headers and no JSONP, so they cannot be read from the browser without a
proxy, and adding a proxy was not wanted.

## Set as your new tab

Point your browser's new tab at `https://startpage.yasogan.dev` (or your own
deployment). Most browsers don't allow a custom new-tab URL on their own — that
visibility was removed to prevent new-tab hijacking — so it is either an
extension or a setting, depending on the browser.

- **Firefox / LibreWolf** — no native custom URL (`browser.newtab.url` was
  removed, and the built-in *New tabs* menu only offers **Firefox Home** or
  **Blank Page**). Install
  [New Tab Override](https://addons.mozilla.org/firefox/addon/new-tab-override/)
  and set it to `https://startpage.yasogan.dev`.
- **Chrome / Edge / Brave (Chromium)** — also no native setting; use a Manifest V3
  extension such as *New Tab Redirect* or *Custom New Tab URL*. Managed/enterprise
  devices can use the `NewTabPageLocation` policy instead.
- **Safari (macOS)** — native, no extension: **Settings → General**, set
  **Homepage** to `https://startpage.yasogan.dev` and **New tabs open with** to
  **Homepage**.
- **Safari (iOS/iPadOS)** — not possible; the Start Page can't point at an
  arbitrary URL.

You can also install the site as a PWA (the install icon in Chrome/Edge, or
**Install** in Firefox) for a standalone, chrome-less window that works offline.

## Deploy your own

The build is a fully static `dist/`, deployed as a Cloudflare **Worker with
static assets** (see `wrangler.jsonc`). Node 22+ is required.

```bash
pnpm install
pnpm build      # tsc -b && vite build -> dist/
pnpm deploy     # pnpm build && wrangler deploy
```

Before you deploy, edit `wrangler.jsonc`:

- change `name` to your own Worker name;
- replace — or remove — the `routes` entry, which points at
  `startpage.yasogan.dev` and only works when that zone is in your Cloudflare
  account.

`public/_headers` ships with the build and sets a strict Content-Security-Policy
(`connect-src` allows the clock, Open-Meteo and BigDataCloud hosts, and `img-src`
the DuckDuckGo favicon service), immutable caching for `/assets/*`, and `no-cache`
for `/sw.js`, `/index.html` and the manifest, so service-worker updates are picked
up immediately. Since `dist/` is self-contained, any static host will do.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | focus search |
| `Ctrl`/`Cmd`+`K` | command palette (jump to a link) |
| `Enter` | submit search |
| `Alt`+`1` / `Alt`+`2` | DDG / DDG No-AI |
| `t` | cycle theme (dark → light → system) |
| `Esc` | clear search / close palette / close settings / blur |

## How offline caching works

`vite-plugin-pwa` (Workbox `generateSW`, `registerType: 'autoUpdate'`) precaches
every build asset, including `index.html`, so the startpage loads with no
network after the first visit. A new build is detected in the background and
prompted on screen before reloading. To verify: `pnpm build && pnpm preview`,
load the page once, then go offline in DevTools and reload.

## Quality

`pnpm test` runs the logic, store and DOM component suites (**225** tests across
**24** files), and `pnpm coverage` enforces **100%** statements, branches,
functions and lines. CI (`.github/workflows/ci.yml`) runs coverage and the
production build on every push and pull request.

## License

Released under the [MIT License](LICENSE).
