// ── Unified Audit API Route ──
// Runs Lighthouse (PSI) + Custom Audit Engine in parallel
// Includes caching and rate limiting

import { NextRequest, NextResponse } from 'next/server'
import { runCustomAudit, calculateHealthScore } from '@/lib/audit-engine'
import { cacheKey, getCached, setCache } from '@/lib/audit-engine/cache'

// ── Rate limiter (in-memory) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5           // max requests
const RATE_WINDOW = 60_000     // per 60 seconds
const GLOBAL_TIMEOUT = 45_000  // 45s total

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

// ── Existing PSI logic (reused from /api/audit) ──
const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']

async function fetchLighthouse(url: string, strategy: string) {
  const apiKey = process.env.GOOGLE_PSI_API_KEY
  const keyParam = apiKey ? `&key=${apiKey}` : ''
  const psiUrl = `${PSI_ENDPOINT}?url=${encodeURIComponent(url)}&strategy=${strategy}&${CATEGORIES.map(c => `category=${c}`).join('&')}${keyParam}`

  const res = await fetch(psiUrl, { next: { revalidate: 0 } })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody?.error?.message || `PSI returned ${res.status}`)
  }

  const data = await res.json()
  const lhr = data.lighthouseResult
  const fex = data.loadingExperience
  const audit = (id: string) => lhr?.audits?.[id]
  const auditVal = (id: string) => audit(id)?.displayValue ?? 'N/A'
  const auditScore = (id: string): number => Math.round((audit(id)?.score ?? 0) * 100)

  const scores = {
    performance: Math.round((lhr?.categories?.performance?.score ?? 0) * 100),
    accessibility: Math.round((lhr?.categories?.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((lhr?.categories?.['best-practices']?.score ?? 0) * 100),
    seo: Math.round((lhr?.categories?.seo?.score ?? 0) * 100),
  }

  const cwv = {
    lcp: { value: auditVal('largest-contentful-paint'), score: auditScore('largest-contentful-paint'), numericValue: audit('largest-contentful-paint')?.numericValue ?? 0 },
    inp: {
      value: auditVal('interaction-to-next-paint') !== 'N/A' ? auditVal('interaction-to-next-paint') : auditVal('total-blocking-time'),
      score: auditScore('interaction-to-next-paint') || auditScore('total-blocking-time'),
      numericValue: audit('interaction-to-next-paint')?.numericValue ?? audit('total-blocking-time')?.numericValue ?? 0,
    },
    cls: { value: auditVal('cumulative-layout-shift'), score: auditScore('cumulative-layout-shift'), numericValue: audit('cumulative-layout-shift')?.numericValue ?? 0 },
    fcp: { value: auditVal('first-contentful-paint'), score: auditScore('first-contentful-paint') },
    ttfb: { value: auditVal('server-response-time'), score: auditScore('server-response-time'), numericValue: audit('server-response-time')?.numericValue ?? 0 },
    si: { value: auditVal('speed-index'), score: auditScore('speed-index') },
    tbt: { value: auditVal('total-blocking-time'), score: auditScore('total-blocking-time'), numericValue: audit('total-blocking-time')?.numericValue ?? 0 },
  }

  const fieldData = fex?.metrics ? {
    lcp: fex.metrics.LARGEST_CONTENTFUL_PAINT_MS ? { p75: fex.metrics.LARGEST_CONTENTFUL_PAINT_MS.percentile, category: fex.metrics.LARGEST_CONTENTFUL_PAINT_MS.category } : null,
    fid: fex.metrics.FIRST_INPUT_DELAY_MS ? { p75: fex.metrics.FIRST_INPUT_DELAY_MS.percentile, category: fex.metrics.FIRST_INPUT_DELAY_MS.category } : null,
    cls: fex.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE ? { p75: fex.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile, category: fex.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.category } : null,
    inp: fex.metrics.INTERACTION_TO_NEXT_PAINT ? { p75: fex.metrics.INTERACTION_TO_NEXT_PAINT.percentile, category: fex.metrics.INTERACTION_TO_NEXT_PAINT.category } : null,
    overallCategory: fex.overall_category,
  } : null

  const opportunities = lhr?.audits ?? {}
  const opportunityIds = [
    'render-blocking-resources', 'uses-optimized-images', 'uses-webp-images',
    'uses-text-compression', 'uses-long-cache-ttl', 'efficient-animated-content',
    'unused-javascript', 'unused-css-rules', 'uses-passive-event-listeners',
    'no-document-write', 'dom-size', 'bootup-time', 'mainthread-work-breakdown',
    'uses-rel-preload', 'uses-rel-preconnect', 'font-display',
  ]
  const topOpportunities = opportunityIds
    .filter(id => opportunities[id] && opportunities[id].score !== null && opportunities[id].score < 1)
    .map(id => {
      const a = opportunities[id]
      return {
        id, title: a.title, description: a.description,
        score: Math.round((a.score ?? 0) * 100),
        displayValue: a.displayValue ?? '',
        impact: a.score < 0.5 ? 'high' : a.score < 0.9 ? 'medium' : 'low',
      }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)

  const diagnosticIds = [
    'largest-contentful-paint-element', 'layout-shift-elements',
    'long-tasks', 'third-party-summary', 'network-requests',
    'resource-summary', 'total-byte-weight',
  ]
  const diagnostics = diagnosticIds
    .filter(id => lhr?.audits?.[id])
    .map(id => ({ id, title: lhr.audits[id].title, displayValue: lhr.audits[id].displayValue ?? '', score: lhr.audits[id].score }))

  return {
    url, strategy,
    fetchedAt: new Date().toISOString(),
    scores, cwv, fieldData,
    opportunities: topOpportunities,
    diagnostics,
    lighthouseVersion: lhr?.lighthouseVersion,
    userAgent: lhr?.environment?.hostUserAgent ?? '',
  }
}

// ── Main handler ──
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const strategy = (searchParams.get('strategy') || 'mobile') as 'mobile' | 'desktop'

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid URL. Must start with http:// or https://' }, { status: 400 })
  }

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again in 60 seconds.' }, { status: 429 })
  }

  // Check cache
  const key = cacheKey(parsedUrl.href, strategy)
  const cached = getCached<any>(key)
  if (cached) {
    return NextResponse.json({ ...cached, fromCache: true })
  }

  try {
    // Run Lighthouse + Custom Audit in parallel, with global timeout
    const [lighthouseResult, customAuditResult] = await Promise.race([
      Promise.all([
        fetchLighthouse(parsedUrl.href, strategy),
        runCustomAudit(parsedUrl.href),
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Audit timed out after 45 seconds')), GLOBAL_TIMEOUT)
      ),
    ])

    // Calculate combined health score
    const healthScore = calculateHealthScore(
      lighthouseResult.scores.performance,
      customAuditResult.overallScore
    )

    const response = {
      ...lighthouseResult,
      customAudit: customAuditResult,
      healthScore,
      fromCache: false,
    }

    // Cache the result
    setCache(key, response)

    return NextResponse.json(response)
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Audit failed. Check the URL and try again.' },
      { status: 502 }
    )
  }
}
