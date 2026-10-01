/**
 * Network time via HTTPS.
 *
 * Browsers cannot open raw UDP sockets, so true NTP (port 123) is impossible
 * from a web page. Instead we sample an HTTPS endpoint and keep the difference
 * between network time and the local clock as an offset. That corrects a wrong
 * or fuzzed system clock (e.g. browsers with fingerprint-resistance), and the
 * offset is cached so the startpage still works offline.
 */

export interface TimeSample {
  /** Sample time in milliseconds since the Unix epoch. */
  epoch: number
  /** Which endpoint produced the sample. */
  source: string
}

export interface TimeEndpoint {
  source: string
  url: string
  parse: (body: string) => number | null
}

/** Cloudflare edge trace: `ts=<seconds since epoch>`. CORS-open. */
const cloudflare: TimeEndpoint = {
  source: 'cloudflare',
  url: 'https://one.one.one.one/cdn-cgi/trace',
  parse(body) {
    const match = body.match(/^ts=(\d+(?:\.\d+)?)$/m)
    if (!match) return null
    const epoch = Number(match[1]) * 1000
    return Number.isFinite(epoch) ? epoch : null
  },
}

/** timeapi.io: JSON with explicit UTC calendar fields. CORS-open. */
const timeApi: TimeEndpoint = {
  source: 'timeapi',
  url: 'https://timeapi.io/api/Time/current/zone?timeZone=Etc/UTC',
  parse(body) {
    try {
      const data = JSON.parse(body) as Record<string, unknown>
      const { year, month, day, hour, minute, seconds } = data
      if (
        typeof year !== 'number' ||
        typeof month !== 'number' ||
        typeof day !== 'number' ||
        typeof hour !== 'number' ||
        typeof minute !== 'number' ||
        typeof seconds !== 'number'
      ) {
        return null
      }
      const millis = typeof data.milliSeconds === 'number' ? data.milliSeconds : 0
      return Date.UTC(year, month - 1, day, hour, minute, seconds, millis)
    } catch {
      return null
    }
  },
}

export const TIME_ENDPOINTS: readonly TimeEndpoint[] = [cloudflare, timeApi]

/**
 * Try each endpoint in order and return the first valid sample.
 * Returns `null` when every source fails, so callers can fall back to the local
 * clock. Never throws.
 */
export async function fetchNetworkTime(
  fetchImpl: typeof fetch | undefined = globalThis.fetch,
  timeoutMs = 4000,
): Promise<TimeSample | null> {
  if (!fetchImpl) return null

  for (const endpoint of TIME_ENDPOINTS) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(endpoint.url, {
        signal: controller.signal,
        cache: 'no-store',
      })
      if (!response.ok) continue
      const epoch = endpoint.parse(await response.text())
      if (epoch !== null) return { epoch, source: endpoint.source }
    } catch {
      // Unreachable/blocked/aborted — fall through to the next endpoint.
    } finally {
      clearTimeout(timer)
    }
  }

  return null
}

/** Offset to add to local time to match network time. */
export function computeOffset(sampleEpoch: number, localEpoch: number): number {
  return sampleEpoch - localEpoch
}

export function applyOffset(localEpoch: number, offsetMs: number): number {
  return localEpoch + offsetMs
}

export const FALLBACK_TIME_ZONE = 'UTC'

/**
 * The browser's best guess at the local zone. Note that fingerprint-resistant
 * browsers report `UTC` here, which is why the zone is user-overridable.
 */
export function detectedTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE
  } catch {
    return FALLBACK_TIME_ZONE
  }
}

export function isValidTimeZone(zone: string): boolean {
  if (!zone) return false
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

/** All IANA zone names, or an empty list where the API is unavailable. */
export function listTimeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return []
  }
}

/** Use the preferred zone when valid, otherwise fall back to the detected one. */
export function resolveTimeZone(preference: string): string {
  return preference && isValidTimeZone(preference)
    ? preference
    : detectedTimeZone()
}
