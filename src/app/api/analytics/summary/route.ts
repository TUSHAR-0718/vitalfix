// ── Analytics Summary Endpoint ──
// GET /api/analytics/summary — returns aggregated analytics for dashboard

import { NextResponse } from 'next/server'
import { getAnalyticsSummary } from '@/lib/analytics'

// Cache summary for 5 minutes to avoid hammering DB
let cachedSummary: { data: any; expiresAt: number } | null = null

export async function GET() {
  const now = Date.now()

  if (cachedSummary && now < cachedSummary.expiresAt) {
    return NextResponse.json(cachedSummary.data)
  }

  const summary = await getAnalyticsSummary(30)

  if (!summary) {
    return NextResponse.json({
      daily: [], totals: {
        totalAudits: 0, successful: 0, failed: 0, partial: 0,
        avgLatency: 0, cacheHits: 0, cacheMisses: 0,
        retries: 0, timeouts: 0, apiFailures: 0,
        pageViews: 0, invalidUrls: 0,
      },
      topDomains: [], errorBreakdown: {},
    })
  }

  cachedSummary = { data: summary, expiresAt: now + 5 * 60_000 }
  return NextResponse.json(summary)
}
