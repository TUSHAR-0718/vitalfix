import { NextRequest, NextResponse } from 'next/server'

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

// Core categories we always request
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']

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

  try {
    const params = new URLSearchParams({
      url: parsedUrl.href,
      strategy,
      ...Object.fromEntries(CATEGORIES.map(c => [`category`, c])),
    })

    // PSI allows multiple category params — build manually
    const apiKey = process.env.GOOGLE_PSI_API_KEY
    const keyParam = apiKey ? `&key=${apiKey}` : ''
    const psiUrl = `${PSI_ENDPOINT}?url=${encodeURIComponent(parsedUrl.href)}&strategy=${strategy}&${CATEGORIES.map(c => `category=${c}`).join('&')}${keyParam}`

    const res = await fetch(psiUrl, { next: { revalidate: 0 } })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      const message = errBody?.error?.message || `PageSpeed Insights returned ${res.status}`
      return NextResponse.json({ error: message }, { status: res.status })
    }

    const data = await res.json()
    const lhr = data.lighthouseResult
    const fex = data.loadingExperience        // real CrUX field data (may be absent)
    const oex = data.originLoadingExperience  // site-wide CrUX

    // ── Helper to extract audit value ──
    const audit = (id: string) => lhr?.audits?.[id]
    const auditVal = (id: string) => audit(id)?.displayValue ?? 'N/A'
    const auditScore = (id: string): number =>
      Math.round((audit(id)?.score ?? 0) * 100)

    // ── Lighthouse scores (0-100) ──
    const scores = {
      performance: Math.round((lhr?.categories?.performance?.score ?? 0) * 100),
      accessibility: Math.round((lhr?.categories?.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((lhr?.categories?.['best-practices']?.score ?? 0) * 100),
      seo: Math.round((lhr?.categories?.seo?.score ?? 0) * 100),
    }

    // ── Core Web Vitals ──
    const cwv = {
      lcp: {
        value: auditVal('largest-contentful-paint'),
        score: auditScore('largest-contentful-paint'),
        numericValue: audit('largest-contentful-paint')?.numericValue ?? 0,
      },
      inp: {
        // PSI uses 'interaction-to-next-paint' in newer versions, fallback to TBT proxy
        value: auditVal('interaction-to-next-paint') !== 'N/A'
          ? auditVal('interaction-to-next-paint')
          : auditVal('total-blocking-time'),
        score: auditScore('interaction-to-next-paint') || auditScore('total-blocking-time'),
        numericValue: audit('interaction-to-next-paint')?.numericValue
          ?? audit('total-blocking-time')?.numericValue ?? 0,
      },
      cls: {
        value: auditVal('cumulative-layout-shift'),
        score: auditScore('cumulative-layout-shift'),
        numericValue: audit('cumulative-layout-shift')?.numericValue ?? 0,
      },
      fcp: {
        value: auditVal('first-contentful-paint'),
        score: auditScore('first-contentful-paint'),
      },
      ttfb: {
        value: auditVal('server-response-time'),
        score: auditScore('server-response-time'),
        numericValue: audit('server-response-time')?.numericValue ?? 0,
      },
      si: {
        value: auditVal('speed-index'),
        score: auditScore('speed-index'),
      },
      tbt: {
        value: auditVal('total-blocking-time'),
        score: auditScore('total-blocking-time'),
        numericValue: audit('total-blocking-time')?.numericValue ?? 0,
      },
    }

    // ── Field data (CrUX) if available ──
    const fieldData = fex?.metrics
      ? {
          lcp: fex.metrics.LARGEST_CONTENTFUL_PAINT_MS
            ? {
                p75: fex.metrics.LARGEST_CONTENTFUL_PAINT_MS.percentile,
                category: fex.metrics.LARGEST_CONTENTFUL_PAINT_MS.category,
              }
            : null,
          fid: fex.metrics.FIRST_INPUT_DELAY_MS
            ? {
                p75: fex.metrics.FIRST_INPUT_DELAY_MS.percentile,
                category: fex.metrics.FIRST_INPUT_DELAY_MS.category,
              }
            : null,
          cls: fex.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE
            ? {
                p75: fex.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile,
                category: fex.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.category,
              }
            : null,
          inp: fex.metrics.INTERACTION_TO_NEXT_PAINT
            ? {
                p75: fex.metrics.INTERACTION_TO_NEXT_PAINT.percentile,
                category: fex.metrics.INTERACTION_TO_NEXT_PAINT.category,
              }
            : null,
          overallCategory: fex.overall_category,
        }
      : null

    // ── Top opportunities (sorted by potential savings) ──
    const opportunities = (lhr?.audits ?? {})
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
          id,
          title: a.title,
          description: a.description,
          score: Math.round((a.score ?? 0) * 100),
          displayValue: a.displayValue ?? '',
          impact: a.score < 0.5 ? 'high' : a.score < 0.9 ? 'medium' : 'low',
        }
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 8)

    // ── Diagnostics ──
    const diagnosticIds = [
      'largest-contentful-paint-element', 'layout-shift-elements',
      'long-tasks', 'third-party-summary', 'network-requests',
      'resource-summary', 'total-byte-weight',
    ]
    const diagnostics = diagnosticIds
      .filter(id => lhr?.audits?.[id])
      .map(id => ({
        id,
        title: lhr.audits[id].title,
        displayValue: lhr.audits[id].displayValue ?? '',
        score: lhr.audits[id].score,
      }))

    return NextResponse.json({
      url: parsedUrl.href,
      strategy,
      fetchedAt: new Date().toISOString(),
      scores,
      cwv,
      fieldData,
      opportunities: topOpportunities,
      diagnostics,
      lighthouseVersion: lhr?.lighthouseVersion,
      userAgent: lhr?.environment?.hostUserAgent ?? '',
    })
  } catch (err: any) {
    console.error('[audit API]', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to contact PageSpeed Insights. Check your URL and try again.' },
      { status: 502 }
    )
  }
}
