// ── In-memory LRU cache with TTL ──

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const MAX_ENTRIES = 100
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

const store = new Map<string, CacheEntry<any>>()

export function cacheKey(url: string, strategy: string): string {
  return `${strategy}::${url.toLowerCase().replace(/\/+$/, '')}`
}

export function getCached<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  // Move to end (most recently used)
  store.delete(key)
  store.set(key, entry)
  return entry.data as T
}

export function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  // Periodically clean expired entries to prevent stale memory usage
  cleanupExpired()
  // Evict oldest if at capacity
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value
    if (oldest) store.delete(oldest)
  }
  store.set(key, { data, expiresAt: Date.now() + ttl })
}

// Clean expired entries at most once per minute
let lastCacheCleanup = 0
function cleanupExpired() {
  const now = Date.now()
  if (now - lastCacheCleanup < 60_000) return
  lastCacheCleanup = now
  store.forEach((entry, key) => {
    if (now > entry.expiresAt) store.delete(key)
  })
}

export function clearCache(): void {
  store.clear()
}
