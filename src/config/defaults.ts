import type { Engine, EngineId, Settings } from '../types'

export const SCHEMA_VERSION = 1

/** Storage key also read by the inline no-flash script in index.html. */
export const STORAGE_KEY = 'startpage.settings.v1'

export const ENGINES: Record<EngineId, Engine> = {
  ddg: {
    id: 'ddg',
    label: 'DDG',
    url: 'https://duckduckgo.com/?q=%s',
  },
  'ddg-noai': {
    id: 'ddg-noai',
    label: 'DDG NO-AI',
    url: 'https://noai.duckduckgo.com/?q=%s',
  },
}

/** Display order of the engine toggle. */
export const ENGINE_ORDER: EngineId[] = ['ddg', 'ddg-noai']

export const DEFAULT_SETTINGS: Settings = {
  version: SCHEMA_VERSION,
  theme: 'dark',
  engine: 'ddg',
  timeZone: '',
  syncTime: true,
  favicons: true,
  clock24: true,
  showSeconds: true,
  weather: {
    enabled: false,
    latitude: null,
    longitude: null,
    label: '',
    unit: 'celsius',
  },
  groups: [
    {
      title: 'Daily',
      links: [
        { label: 'Hacker News', url: 'https://news.ycombinator.com/' },
        { label: 'Wikipedia', url: 'https://en.wikipedia.org/' },
        { label: 'YouTube', url: 'https://www.youtube.com/' },
      ],
    },
    {
      title: 'Dev',
      links: [
        { label: 'GitHub', url: 'https://github.com/' },
        { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
        { label: 'Stack Overflow', url: 'https://stackoverflow.com/' },
      ],
    },
    {
      title: 'Social',
      links: [
        { label: 'Reddit', url: 'https://www.reddit.com/' },
        { label: 'Mastodon', url: 'https://mastodon.social/' },
        { label: 'Bluesky', url: 'https://bsky.app/' },
      ],
    },
  ],
}
