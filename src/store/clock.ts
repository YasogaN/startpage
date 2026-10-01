import { createRoot, createSignal } from 'solid-js'
import { computeOffset, fetchNetworkTime } from '../lib/time'

const CACHE_KEY = 'startpage.time.v1'
/** Re-sync if the cached sample is older than this. */
export const MAX_CACHE_AGE_MS = 60 * 60 * 1000

interface TimeCache {
  offsetMs: number
  source: string
  syncedAt: number
}

function readCache(): TimeCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<TimeCache>
    if (typeof parsed.offsetMs !== 'number' || typeof parsed.syncedAt !== 'number') {
      return null
    }
    return {
      offsetMs: parsed.offsetMs,
      source: typeof parsed.source === 'string' ? parsed.source : 'cached',
      syncedAt: parsed.syncedAt,
    }
  } catch {
    return null
  }
}

function writeCache(cache: TimeCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Storage unavailable — sync still applies for this session.
  }
}

interface ClockOptions {
  fetchImpl?: typeof fetch
  now?: () => number
}

/**
 * App-wide clock. `now()` returns network-corrected epoch milliseconds, and
 * `sync()` refreshes the offset from the network when the cache is stale.
 */
export const clock = createRoot(() => {
  const cached = readCache()
  const [offsetMs, setOffsetMs] = createSignal(cached?.offsetMs ?? 0)
  const [source, setSource] = createSignal(cached?.source ?? 'local')
  const [syncedAt, setSyncedAt] = createSignal(cached?.syncedAt ?? 0)
  const [syncing, setSyncing] = createSignal(false)

  let options: ClockOptions = {}
  const localNow = () => (options.now ? options.now() : Date.now())
  const now = () => localNow() + offsetMs()

  const sync = async (force = false): Promise<boolean> => {
    if (syncing()) return false
    const isFresh = syncedAt() > 0 && localNow() - syncedAt() < MAX_CACHE_AGE_MS
    if (!force && isFresh) return false

    setSyncing(true)
    const localEpoch = localNow()
    const sample = await fetchNetworkTime(options.fetchImpl)
    if (sample) {
      const offset = computeOffset(sample.epoch, localEpoch)
      setOffsetMs(offset)
      setSource(sample.source)
      setSyncedAt(localEpoch)
      writeCache({ offsetMs: offset, source: sample.source, syncedAt: localEpoch })
      setSyncing(false)
      return true
    }
    setSyncing(false)
    return false
  }

  /** Test seam: inject a fetch implementation and clock. */
  const configure = (next: ClockOptions) => {
    options = next
  }

  return { offsetMs, source, syncedAt, syncing, now, sync, configure }
})
