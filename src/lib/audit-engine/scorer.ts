// ── Smart Scoring System ──
// Combines per-category scores and merges with Lighthouse

import { CategoryResult, CustomAuditResult } from './types'

// Severity weights for score calculation
const SEVERITY_WEIGHT = { critical: 3, moderate: 2, minor: 1, info: 0 }

// Category weights for overall custom audit score
const CATEGORY_WEIGHT: Record<string, number> = {
  'broken-links': 1.0,
  'images': 1.0,
  'assets': 1.0,
  'meta-tags': 0.8,
  'headings': 0.6,
  'security': 1.2,
  'mobile': 1.0,
  'accessibility': 1.1,
}

/**
 * Calculate the overall custom audit score from category results.
 */
export function calculateOverallScore(categories: CategoryResult[]): number {
  if (categories.length === 0) return 0

  let weightedSum = 0
  let totalWeight = 0

  for (const cat of categories) {
    const w = CATEGORY_WEIGHT[cat.category] ?? 1.0
    weightedSum += cat.score * w
    totalWeight += w
  }

  return Math.round(weightedSum / totalWeight)
}

/**
 * Calculate the combined Health Score from Lighthouse + custom audit.
 * Lighthouse weight: 60%, Custom audit weight: 40%
 */
export function calculateHealthScore(
  lighthousePerformance: number,
  customAuditScore: number
): number {
  return Math.round(lighthousePerformance * 0.6 + customAuditScore * 0.4)
}

/**
 * Count findings by severity.
 */
export function countBySeverity(categories: CategoryResult[]) {
  let critical = 0, moderate = 0, minor = 0

  for (const cat of categories) {
    for (const f of cat.findings) {
      if (f.severity === 'critical') critical++
      else if (f.severity === 'moderate') moderate++
      else if (f.severity === 'minor') minor++
    }
  }

  return { critical, moderate, minor }
}

/**
 * Build the full CustomAuditResult from category results.
 */
export function buildCustomAuditResult(
  url: string,
  categories: CategoryResult[],
  duration: number
): CustomAuditResult {
  const overallScore = calculateOverallScore(categories)
  const { critical, moderate, minor } = countBySeverity(categories)
  const totalFindings = critical + moderate + minor

  return {
    url,
    fetchedAt: new Date().toISOString(),
    duration,
    overallScore,
    categories,
    totalFindings,
    critical,
    moderate,
    minor,
  }
}
