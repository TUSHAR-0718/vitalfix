// ── Scan History Utility Tests ──
// Tests the pure utility functions (no localStorage dependency)

import { describe, it, expect } from 'vitest'
import { relativeTime, groupByDate } from '@/lib/scan-history'
import type { StoredScan } from '@/lib/scan-history'

// ── Helper: build a minimal StoredScan ──
function makeScan(overrides: Partial<StoredScan> = {}): StoredScan {
  return {
    id: `scan_${Date.now()}`,
    url: 'https://example.com',
    strategy: 'desktop',
    fetchedAt: new Date().toISOString(),
    healthScore: 85,
    scores: { performance: 90, accessibility: 80, bestPractices: 90, seo: 95 },
    cwvSummary: null,
    customAuditScore: 80,
    totalFindings: 3,
    critical: 1,
    moderate: 1,
    minor: 1,
    fieldOverallCategory: null,
    partial: false,
    ...overrides,
  }
}

// ──────────────────────────────────────────────
// relativeTime
// ──────────────────────────────────────────────

describe('relativeTime', () => {
  it('returns "just now" for times less than a minute ago', () => {
    const now = new Date().toISOString()
    expect(relativeTime(now)).toBe('just now')
  })

  it('returns minutes for times less than an hour ago', () => {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60_000).toISOString()
    expect(relativeTime(thirtyMinsAgo)).toBe('30m ago')
  })

  it('returns hours for times less than a day ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString()
    expect(relativeTime(twoHoursAgo)).toBe('2h ago')
  })

  it('returns "Yesterday" for times 1-2 days ago', () => {
    const yesterday = new Date(Date.now() - 36 * 60 * 60_000).toISOString()
    expect(relativeTime(yesterday)).toBe('Yesterday')
  })

  it('returns days for times within a week', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString()
    expect(relativeTime(threeDaysAgo)).toBe('3d ago')
  })

  it('returns formatted date for older times', () => {
    const oldDate = new Date('2025-01-15').toISOString()
    const result = relativeTime(oldDate)
    expect(result).toContain('Jan')
    expect(result).toContain('15')
  })
})

// ──────────────────────────────────────────────
// groupByDate
// ──────────────────────────────────────────────

describe('groupByDate', () => {
  it('returns empty array for no scans', () => {
    expect(groupByDate([])).toEqual([])
  })

  it('groups today\'s scans under "Today"', () => {
    const scans = [
      makeScan({ fetchedAt: new Date().toISOString() }),
      makeScan({ fetchedAt: new Date().toISOString() }),
    ]
    const groups = groupByDate(scans)

    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Today')
    expect(groups[0].scans).toHaveLength(2)
  })

  it('separates today and yesterday into different groups', () => {
    const scans = [
      makeScan({ fetchedAt: new Date().toISOString() }),
      makeScan({ fetchedAt: new Date(Date.now() - 36 * 60 * 60_000).toISOString() }),
    ]
    const groups = groupByDate(scans)

    expect(groups.length).toBeGreaterThanOrEqual(2)
    const labels = groups.map(g => g.label)
    expect(labels).toContain('Today')
    expect(labels).toContain('Yesterday')
  })

  it('groups week-old scans under "This Week"', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60_000).toISOString()
    const scans = [makeScan({ fetchedAt: fiveDaysAgo })]
    const groups = groupByDate(scans)

    expect(groups[0].label).toBe('This Week')
  })
})
