// ── Unified Audit API Route ──
// Runs Lighthouse (PSI) + Custom Audit Engine in parallel
// Includes caching, rate limiting, and structured error handling

import { NextRequest, NextResponse } from 'next/server'
import { runCustomAudit, calculateHealthScore } from '@/lib/audit-engine'
import { cacheKey, getCached, setCache } from '@/lib/audit-engine/cache'

// ── Structured error for PSI failures ──
class PSIError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'PSIError'
    this.status = status
  }
}

// ── SSRF Protection — block private/internal URLs ──
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '[::]']
const PRIVATE_IP_PATTERNS = [
  /^10\./,                              // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./,         // 172.16.0.0/12
  /^192\.168\./,                         // 192.168.0.0/16
  /^169\.254\./,                         // link-local / AWS metadata
  /^0\./,                               // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./,  // CGNAT 100.64.0.0/10
]

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (BLOCKED_HOSTS.includes(h)) return true
  return PRIVATE_IP_PATTERNS.some(p => p.test(h))
}

// ── Rate limiter (in-memory) with periodic cleanup ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5           // max requests
const RATE_WINDOW = 60_000     // per 60 seconds
const CLEANUP_INTERVAL = 5 * 60_000 // clean expired entries every 5 minutes

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

// Periodic cleanup to prevent unbounded map growth
let lastCleanup = Date.now()
function cleanupRateLimitMap() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  rateLimitMap.forEach((entry, ip) => {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  })
}

// ── PSI fetch with dedicated timeout ──
const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const PSI_TIMEOUT = 30_000     // 30s for PSI specifically
const GLOBAL_TIMEOUT = 45_000  // 45s for the entire audit

async function fetchLighthouse(url: string, strategy: string) {
  const apiKey = process.env.GOOGLE_PSI_API_KEY
  const keyParam = apiKey ? `&key=${apiKey}` : ''
  const psiUrl = `${PSI_ENDPOINT}?url=${encodeURIComponent(url)}&strategy=${strategy}&${CATEGORIES.map(c => `category=${c}`).join('&')}${keyParam}`

  // Dedicated AbortController so PSI timeout doesn't waste custom audit results
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PSI_TIMEOUT)

  try {
    const res = await fetch(psiUrl, {
      signal: controller.signal,
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      const message = errBody?.error?.message || `PageSpeed Insights returned ${res.status}`
      throw new PSIError(message, res.status)
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
        score: audit('interaction-to-next-paint')?.score != null ? auditScore('interaction-to-next-paint') : auditScore('total-blocking-time'),
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
  } catch (err) {
    // Re-throw PSIError as-is; wrap AbortError with a clear message
    if (err instanceof PSIError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new PSIError('PageSpeed Insights timed out after 30 seconds', 504)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// ── Main handler ──
export async function GET(req: NextRequest) {
  // Cleanup expired rate limit entries periodically
  cleanupRateLimitMap()

  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const rawStrategy = searchParams.get('strategy') || 'mobile'

  // Validate strategy parameter
  if (rawStrategy !== 'mobile' && rawStrategy !== 'desktop') {
    return NextResponse.json({ error: 'Invalid strategy. Must be "mobile" or "desktop".' }, { status: 400 })
  }
  const strategy = rawStrategy as 'mobile' | 'desktop'

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

  // SSRF protection — block private/internal URLs
  if (isBlockedHost(parsedUrl.hostname)) {
    return NextResponse.json({ error: 'URLs pointing to internal or private networks are not allowed.' }, { status: 400 })
  }

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again in 60 seconds.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(RATE_WINDOW / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMIT),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  // Check cache
  const key = cacheKey(parsedUrl.href, strategy)
  const cached = getCached<any>(key)
  if (cached) {
    return NextResponse.json({ ...cached, fromCache: true })
  }

  // Global timeout with proper cleanup
  let globalTimer: ReturnType<typeof setTimeout> | undefined

  try {
    // Run Lighthouse + Custom Audit in parallel with graceful degradation.
    // Promise.allSettled ensures one failure doesn't kill the other's results.
    const settled = await Promise.race([
      Promise.allSettled([
        fetchLighthouse(parsedUrl.href, strategy),
        runCustomAudit(parsedUrl.href),
      ]),
      new Promise<never>((_, reject) => {
        globalTimer = setTimeout(
          () => reject(new Error('Audit timed out after 45 seconds')),
          GLOBAL_TIMEOUT,
        )
      }),
    ])

    // Clear the global timeout since the audit completed
    clearTimeout(globalTimer)

    const lighthouseResult = settled[0].status === 'fulfilled' ? settled[0].value : null
    const customAuditResult = settled[1].status === 'fulfilled' ? settled[1].value : null

    // If both failed, return an error
    if (!lighthouseResult && !customAuditResult) {
      const psiErr = settled[0].status === 'rejected' ? settled[0].reason : null
      const customErr = settled[1].status === 'rejected' ? settled[1].reason : null
      const message = psiErr?.message || customErr?.message || 'Audit failed. Check the URL and try again.'
      console.error('[audit API] Both audits failed:', { psi: psiErr?.message, custom: customErr?.message })

      if (psiErr instanceof PSIError) {
        const clientStatus = psiErr.status === 429 ? 429 : psiErr.status >= 400 && psiErr.status < 500 ? 400 : 502
        return NextResponse.json({ error: message }, { status: clientStatus })
      }
      return NextResponse.json({ error: message }, { status: 502 })
    }

    // Log partial failures (non-blocking)
    if (!lighthouseResult) {
      const reason = settled[0].status === 'rejected' ? settled[0].reason?.message : 'unknown'
      console.warn('[audit API] PSI failed, returning custom audit only:', reason)
    }
    if (!customAuditResult) {
      const reason = settled[1].status === 'rejected' ? settled[1].reason?.message : 'unknown'
      console.warn('[audit API] Custom audit failed, returning PSI only:', reason)
    }

    // Calculate combined health score (handle partial results)
    const psiPerf = lighthouseResult?.scores?.performance ?? 0
    const customScore = customAuditResult?.overallScore ?? 0
    const healthScore = lighthouseResult && customAuditResult
      ? calculateHealthScore(psiPerf, customScore)
      : lighthouseResult ? psiPerf : customScore

    const response = {
      ...(lighthouseResult || { url: parsedUrl.href, strategy, fetchedAt: new Date().toISOString(), scores: null, cwv: null, fieldData: null, opportunities: [], diagnostics: [] }),
      customAudit: customAuditResult || null,
      healthScore,
      fromCache: false,
      partial: !lighthouseResult || !customAuditResult,
    }

    // Only cache complete results
    if (lighthouseResult && customAuditResult) {
      setCache(key, response)
    }

    return NextResponse.json(response)
  } catch (err: any) {
    clearTimeout(globalTimer)

    // Propagate PSI-specific status codes
    if (err instanceof PSIError) {
      const clientStatus = err.status === 429 ? 429 : err.status >= 400 && err.status < 500 ? 400 : 502
      return NextResponse.json({ error: err.message }, { status: clientStatus })
    }

    console.error('[audit API]', err)
    return NextResponse.json(
      { error: err?.message || 'Audit timed out. Try again.' },
      { status: 502 }
    )
  }
}
