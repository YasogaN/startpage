export type EngineId = 'ddg' | 'ddg-noai'

export type ThemeMode = 'dark' | 'light' | 'system'

export interface Engine {
  /** Stable identifier persisted in settings. */
  id: EngineId
  /** Short uppercase label shown on the engine toggle. */
  label: string
  /** Search template; `%s` is replaced with the encoded query. */
  url: string
}

export interface LinkItem {
  label: string
  url: string
}

export interface LinkGroup {
  title: string
  links: LinkItem[]
}

export interface Settings {
  /** Schema version, bumped when the persisted shape changes. */
  version: number
  theme: ThemeMode
  engine: EngineId
  /** Preferred IANA timezone. Empty string means "detect automatically". */
  timeZone: string
  /** Sync the clock against a network time source. */
  syncTime: boolean
  groups: LinkGroup[]
}
