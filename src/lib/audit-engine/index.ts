// ── Audit Engine Orchestrator ──
// Runs all 8 audit modules in parallel with per-module timeouts

import { FetchResult, CategoryResult, CustomAuditResult } from './types'
import { fetchPage } from './fetcher'
import { buildCustomAuditResult } from './scorer'

import { checkBrokenLinks } from './broken-links'
import { checkImages } from './images'
import { checkAssets } from './assets'
import { checkMetaTags } from './meta-tags'
import { checkHeadings } from './headings'
import { checkSecurity } from './security'
import { checkMobile } from './mobile'
import { checkAccessibility } from './accessibility'

const MODULE_TIMEOUT = 8_000 // 8 seconds per module

type AuditModule = (fetched: FetchResult) => Promise<CategoryResult>

const modules: AuditModule[] = [
  checkBrokenLinks,
  checkImages,
  checkAssets,
  checkMetaTags,
  checkHeadings,
  checkSecurity,
  checkMobile,
  checkAccessibility,
]

/**
 * Run a single module with a timeout.
 */
async function runWithTimeout(
  fn: AuditModule,
  fetched: FetchResult,
  timeout: number
): Promise<CategoryResult | null> {
  return Promise.race([
    fn(fetched),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeout)),
  ])
}

/**
 * Run the full custom audit engine against a URL.
 * Fetches the page once, then runs all 8 audit modules in parallel.
 */
export async function runCustomAudit(url: string): Promise<CustomAuditResult> {
  const start = Date.now()

  // Step 1: Fetch the page (shared across all modules)
  const fetched = await fetchPage(url, 15_000)

  // Step 2: Run all modules in parallel with individual timeouts
  const results = await Promise.allSettled(
    modules.map(mod => runWithTimeout(mod, fetched, MODULE_TIMEOUT))
  )

  // Step 3: Collect results (skip failed/timed-out modules)
  const categories: CategoryResult[] = []
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value !== null) {
      categories.push(r.value)
    }
  }

  const duration = Date.now() - start

  // Step 4: Build the final result with scoring
  return buildCustomAuditResult(url, categories, duration)
}

// Re-export types for convenience
export type { CustomAuditResult, CategoryResult, AuditFinding } from './types'
export { calculateHealthScore } from './scorer'
