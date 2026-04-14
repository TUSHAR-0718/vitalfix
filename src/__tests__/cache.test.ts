// ── Unit Tests: Cache Module ──
// Tests the in-memory LRU cache with TTL

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cacheKey, getCached, setCache, clearCache } from '@/lib/audit-engine/cache'

beforeEach(() => {
  clearCache()
})

describe('cacheKey', () => {
  it('normalizes URL to lowercase and strips trailing slash', () => {
    expect(cacheKey('https://Example.Com/', 'mobile')).toBe('mobile::https://example.com')
    expect(cacheKey('https://Site.IO/path/', 'desktop')).toBe('desktop::https://site.io/path')
  })

  it('includes strategy in the key', () => {
    const k1 = cacheKey('https://test.com', 'mobile')
    const k2 = cacheKey('https://test.com', 'desktop')
    expect(k1).not.toBe(k2)
  })
})

describe('getCached / setCache', () => {
  it('returns null for uncached key', () => {
    expect(getCached('nonexistent')).toBeNull()
  })

  it('stores and retrieves a value', () => {
    setCache('key1', { score: 95 })
    expect(getCached('key1')).toEqual({ score: 95 })
  })

  it('returns null after TTL expires', () => {
    vi.useFakeTimers()
    setCache('key2', { data: 'test' }, 1000) // 1 second TTL
    vi.advanceTimersByTime(1500)
    expect(getCached('key2')).toBeNull()
    vi.useRealTimers()
  })

  it('evicts oldest entry when at capacity', () => {
    // Cache capacity is 100 — fill it up
    for (let i = 0; i < 100; i++) {
      setCache(`fill-${i}`, i)
    }
    // Adding one more should evict the first
    setCache('overflow', 'new')
    expect(getCached('fill-0')).toBeNull()
    expect(getCached('overflow')).toBe('new')
  })
})

describe('clearCache', () => {
  it('removes all entries', () => {
    setCache('a', 1)
    setCache('b', 2)
    clearCache()
    expect(getCached('a')).toBeNull()
    expect(getCached('b')).toBeNull()
  })
})
