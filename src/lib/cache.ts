export const FAVICON_CACHE = 'favicons'

export interface CacheStore {
  delete(name: string): Promise<boolean>
}

/** Delete the service-worker favicon cache, if the Cache API is available. */
export async function clearFaviconCache(
  store: CacheStore | undefined = globalThis.caches,
): Promise<boolean> {
  if (!store) return false
  try {
    return await store.delete(FAVICON_CACHE)
  } catch {
    return false
  }
}
