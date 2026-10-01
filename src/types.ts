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

export type TemperatureUnit = 'celsius' | 'fahrenheit'

export interface WeatherSettings {
  enabled: boolean
  latitude: number | null
  longitude: number | null
  /** Optional place name shown next to the temperature. */
  label: string
  unit: TemperatureUnit
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
  /** Show site favicons on link tiles instead of monograms. */
  favicons: boolean
  /** 24-hour clock when true, 12-hour when false. */
  clock24: boolean
  /** Show seconds in the clock. */
  showSeconds: boolean
  weather: WeatherSettings
  groups: LinkGroup[]
}
