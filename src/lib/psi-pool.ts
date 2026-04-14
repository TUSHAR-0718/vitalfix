// ── PSI API Key Pool & Rate Limiter ──
// Round-robin key rotation with per-key throttling via Bottleneck.
// Automatically marks exhausted keys (429) and cycles to the next available one.
//
// ENV:
//   PSI_API_KEYS_POOL  — comma-separated pool (e.g. "key1,key2,key3")
//   GOOGLE_PSI_API_KEY — legacy single-key fallback

import Bottleneck from 'bottleneck'

// ── Types ──

interface KeyState {
  key: string
  exhaustedUntil: number  // timestamp — 0 = available
  limiter: Bottleneck
}

// ── Constants ──

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const REQUESTS_PER_MINUTE = 15          // stay safely under Google's 25/min quota
const EXHAUSTION_COOLDOWN = 120_000     // 2 minutes cooldown for 429'd keys

// ── Parse key pool from environment ──

function parseKeys(): string[] {
  const poolRaw = process.env.PSI_API_KEYS_POOL
  if (poolRaw && poolRaw.trim().length > 0) {
    const keys = poolRaw
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)
    if (keys.length > 0) return keys
  }

  // Fallback to single legacy key
  const single = process.env.GOOGLE_PSI_API_KEY
  if (single && single.trim().length > 0) {
    return [single.trim()]
  }

  // No keys at all — will run without API key (heavily rate-limited by Google)
  return []
}

// ── Build key pool ──

function buildPool(keys: string[]): KeyState[] {
  return keys.map(key => ({
    key,
    exhaustedUntil: 0,
    limiter: new Bottleneck({
      reservoir: REQUESTS_PER_MINUTE,           // initial tokens
      reservoirRefreshAmount: REQUESTS_PER_MINUTE,
      reservoirRefreshInterval: 60_000,          // refill every 60s
      maxConcurrent: 2,                          // max 2 simultaneous per key
      minTime: Math.ceil(60_000 / REQUESTS_PER_MINUTE), // ~4s between requests
    }),
  }))
}

// ── Singleton pool state ──

const KEYS = parseKeys()
const pool: KeyState[] = buildPool(KEYS)
let roundRobinIndex = 0

// Log pool state at startup
if (pool.length === 0) {
  console.warn('[PSI Pool] No API keys configured. PSI requests will be heavily rate-limited by Google.')
  console.warn('[PSI Pool] Set PSI_API_KEYS_POOL or GOOGLE_PSI_API_KEY in .env')
} else {
  console.log(`[PSI Pool] Initialized with ${pool.length} key(s). Rate limit: ${REQUESTS_PER_MINUTE} req/min per key.`)
}

// ── Limiter for keyless requests (fallback) ──

const keylessLimiter = new Bottleneck({
  reservoir: 2,
  reservoirRefreshAmount: 2,
  reservoirRefreshInterval: 60_000, // Google allows ~2-3/min without key
  maxConcurrent: 1,
  minTime: 30_000,
})

// ── Core: get the next available key ──

function getNextAvailableKey(): KeyState | null {
  if (pool.length === 0) return null

  const now = Date.now()
  const tried = new Set<number>()

  while (tried.size < pool.length) {
    const idx = roundRobinIndex % pool.length
    roundRobinIndex = (roundRobinIndex + 1) % pool.length
    tried.add(idx)

    const state = pool[idx]
    if (now >= state.exhaustedUntil) {
      return state
    }
  }

  // All keys exhausted — return the one with the shortest remaining cooldown
  return pool.reduce((a, b) => a.exhaustedUntil < b.exhaustedUntil ? a : b)
}

// ── Mark a key as temporarily exhausted ──

export function markKeyExhausted(keyState: KeyState): void {
  keyState.exhaustedUntil = Date.now() + EXHAUSTION_COOLDOWN
  const masked = keyState.key.slice(0, 8) + '…'
  console.warn(`[PSI Pool] Key ${masked} exhausted (429). Cooldown ${EXHAUSTION_COOLDOWN / 1000}s.`)
}

// ── Public: Throttled PSI fetch ──

export interface PSIFetchOptions {
  url: string
  strategy: string
  categories: string[]
  timeout: number
  signal?: AbortSignal
}

export async function fetchPSI(options: PSIFetchOptions): Promise<Response> {
  const { url, strategy, categories, timeout, signal: parentSignal } = options

  const keyState = getNextAvailableKey()

  // Build PSI URL
  const categoryParams = categories.map(c => `category=${c}`).join('&')
  const keyParam = keyState ? `&key=${keyState.key}` : ''
  const psiUrl = `${PSI_ENDPOINT}?url=${encodeURIComponent(url)}&strategy=${strategy}&${categoryParams}${keyParam}`

  // Per-key abort controller for independent timeout
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  // Forward parent abort signal
  const onParentAbort = () => controller.abort()
  if (parentSignal) {
    if (parentSignal.aborted) { clearTimeout(timer); controller.abort() }
    else parentSignal.addEventListener('abort', onParentAbort, { once: true })
  }

  const doFetch = async (): Promise<Response> => {
    try {
      const res = await fetch(psiUrl, {
        signal: controller.signal,
        next: { revalidate: 0 } as any,
      })

      // Handle 429 — mark key exhausted and retry with next key
      if (res.status === 429 && keyState) {
        markKeyExhausted(keyState)

        // Try one more time with a different key
        const nextKey = getNextAvailableKey()
        if (nextKey && nextKey !== keyState) {
          const retryKeyParam = `&key=${nextKey.key}`
          const retryUrl = `${PSI_ENDPOINT}?url=${encodeURIComponent(url)}&strategy=${strategy}&${categoryParams}${retryKeyParam}`
          console.log('[PSI Pool] Retrying with next key…')

          return nextKey.limiter.schedule(() =>
            fetch(retryUrl, {
              signal: controller.signal,
              next: { revalidate: 0 } as any,
            })
          )
        }
      }

      return res
    } finally {
      clearTimeout(timer)
      if (parentSignal) parentSignal.removeEventListener('abort', onParentAbort)
    }
  }

  // Route through the appropriate limiter
  if (keyState) {
    return keyState.limiter.schedule(doFetch)
  }
  return keylessLimiter.schedule(doFetch)
}

// ── Public: Pool diagnostics (for health checks) ──

export function getPoolStatus(): {
  totalKeys: number
  availableKeys: number
  exhaustedKeys: { masked: string; resumesIn: number }[]
} {
  const now = Date.now()
  const exhausted = pool
    .filter(k => now < k.exhaustedUntil)
    .map(k => ({
      masked: k.key.slice(0, 8) + '…',
      resumesIn: Math.ceil((k.exhaustedUntil - now) / 1000),
    }))

  return {
    totalKeys: pool.length,
    availableKeys: pool.length - exhausted.length,
    exhaustedKeys: exhausted,
  }
}

// ── Re-export constants for use in route.ts ──
export { PSI_ENDPOINT }
