// ── Audit Context ──
// Maps UI selector values to concrete parameters that affect
// PSI request construction, timeout handling, scoring thresholds,
// and recommendation context.
//
// Device → PSI strategy (already handled)
// Connection → timeout scaling, scoring severity thresholds, latency expectations
// Location → regional context labels, CDN distance insights, TTFB expectations

export interface AuditContext {
  strategy: 'mobile' | 'desktop'
  connection: ConnectionProfile
  location: LocationProfile
}

// ── Connection Profiles ──
// Affect: timeout scaling, performance thresholds, scoring context

export interface ConnectionProfile {
  id: string
  label: string
  /** Multiplier for PSI/custom audit timeouts (1.0 = default) */
  timeoutMultiplier: number
  /** Expected round-trip latency in ms — used to contextualize TTFB scores */
  expectedRttMs: number
  /** Throughput estimate in Mbps — used in recommendation context */
  throughputMbps: number
  /** Threshold adjustments: scores above these are considered acceptable for this connection */
  thresholds: {
    lcpGoodMs: number    // LCP good threshold
    lcpPoorMs: number    // LCP poor threshold
    fcpGoodMs: number    // FCP good threshold
    tbtGoodMs: number    // TBT good threshold
    ttfbGoodMs: number   // TTFB good threshold
  }
  /** Severity weight modifier (higher = more strict for slow connections) */
  severityMultiplier: number
}

const CONNECTION_PROFILES: Record<string, ConnectionProfile> = {
  '4G (Fast)': {
    id: '4g-fast', label: '4G (Fast)',
    timeoutMultiplier: 1.0,
    expectedRttMs: 50,
    throughputMbps: 20,
    thresholds: { lcpGoodMs: 2500, lcpPoorMs: 4000, fcpGoodMs: 1800, tbtGoodMs: 200, ttfbGoodMs: 800 },
    severityMultiplier: 1.0,
  },
  '4G (Slow)': {
    id: '4g-slow', label: '4G (Slow)',
    timeoutMultiplier: 1.2,
    expectedRttMs: 150,
    throughputMbps: 4,
    thresholds: { lcpGoodMs: 4000, lcpPoorMs: 6000, fcpGoodMs: 3000, tbtGoodMs: 400, ttfbGoodMs: 1200 },
    severityMultiplier: 0.85,
  },
  '3G': {
    id: '3g', label: '3G',
    timeoutMultiplier: 1.5,
    expectedRttMs: 400,
    throughputMbps: 1.5,
    thresholds: { lcpGoodMs: 6000, lcpPoorMs: 10000, fcpGoodMs: 4500, tbtGoodMs: 600, ttfbGoodMs: 2000 },
    severityMultiplier: 0.7,
  },
  'Cable': {
    id: 'cable', label: 'Cable / Wi-Fi',
    timeoutMultiplier: 0.9,
    expectedRttMs: 20,
    throughputMbps: 50,
    thresholds: { lcpGoodMs: 2000, lcpPoorMs: 3500, fcpGoodMs: 1500, tbtGoodMs: 150, ttfbGoodMs: 600 },
    severityMultiplier: 1.1,
  },
}

// ── Location Profiles ──
// PSI does NOT support custom geographic origin natively.
// We use this to add regional context: latency assumptions, CDN insights,
// TTFB expectations, and contextual labels in the report.

export interface LocationProfile {
  id: string
  label: string
  /** Region code for display */
  region: string
  /** Baseline latency in ms — added to connection RTT for total expected latency */
  baselineLatencyMs: number
  /** Additional recommendations based on geographic distance */
  cdnInsight: string
  /** TTFB adjustment: expected additional latency from server location */
  ttfbAdjustMs: number
}

const LOCATION_PROFILES: Record<string, LocationProfile> = {
  'US East (Virginia)': {
    id: 'us-east', label: 'US East (Virginia)', region: 'NA',
    baselineLatencyMs: 30,
    ttfbAdjustMs: 0,  // PSI servers are US-based, so this is baseline
    cdnInsight: 'Test origin is near Google\'s PSI servers. TTFB reflects best-case performance.',
  },
  'EU West (London)': {
    id: 'eu-west', label: 'EU West (London)', region: 'EU',
    baselineLatencyMs: 80,
    ttfbAdjustMs: 70,
    cdnInsight: 'Users in Europe will experience ~70ms additional latency if the origin server is US-based. Consider a CDN with EU edge nodes.',
  },
  'Asia (Singapore)': {
    id: 'asia-sg', label: 'Asia (Singapore)', region: 'APAC',
    baselineLatencyMs: 180,
    ttfbAdjustMs: 160,
    cdnInsight: 'Users in Asia will experience ~160ms additional latency to US-based servers. Multi-region deployment or a CDN with APAC PoPs is highly recommended.',
  },
  'AU (Sydney)': {
    id: 'au-syd', label: 'AU (Sydney)', region: 'APAC',
    baselineLatencyMs: 220,
    ttfbAdjustMs: 200,
    cdnInsight: 'Users in Australia will experience ~200ms additional TTFB to US servers. Long-distance cable latency is unavoidable — edge caching or an Australian CDN PoP is essential.',
  },
}

// ── Lookup functions ──

export function getConnectionProfile(label: string): ConnectionProfile {
  return CONNECTION_PROFILES[label] || CONNECTION_PROFILES['4G (Fast)']
}

export function getLocationProfile(label: string): LocationProfile {
  return LOCATION_PROFILES[label] || LOCATION_PROFILES['US East (Virginia)']
}

/**
 * Build a full AuditContext from UI selector values.
 */
export function buildAuditContext(
  device: 'mobile' | 'desktop',
  connection: string,
  location: string
): AuditContext {
  return {
    strategy: device,
    connection: getConnectionProfile(connection),
    location: getLocationProfile(location),
  }
}

/**
 * Calculate adjusted timeouts based on connection profile.
 * Returns scaled versions of the base timeouts.
 */
export function getAdjustedTimeouts(ctx: AuditContext) {
  const m = ctx.connection.timeoutMultiplier
  return {
    psiTimeout: Math.round(90_000 * m),
    psiLiteTimeout: Math.round(45_000 * m),
    customAuditTimeout: Math.round(60_000 * m),
    globalTimeout: Math.round(150_000 * m),
    clientTimeout: Math.round(160_000 * m),
  }
}

/**
 * Adjust a CWV metric's severity based on connection + location context.
 * Returns: 'good', 'needs-improvement', 'poor'
 */
export function rateMetric(
  metricName: 'lcp' | 'fcp' | 'tbt' | 'ttfb',
  valueMs: number,
  ctx: AuditContext
): 'good' | 'needs-improvement' | 'poor' {
  const t = ctx.connection.thresholds
  const locationLatency = ctx.location.ttfbAdjustMs

  let goodThreshold: number
  let poorThreshold: number

  switch (metricName) {
    case 'lcp':
      goodThreshold = t.lcpGoodMs + locationLatency
      poorThreshold = t.lcpPoorMs + locationLatency
      break
    case 'fcp':
      goodThreshold = t.fcpGoodMs + locationLatency
      poorThreshold = t.fcpGoodMs * 2 + locationLatency
      break
    case 'tbt':
      goodThreshold = t.tbtGoodMs
      poorThreshold = t.tbtGoodMs * 3
      break
    case 'ttfb':
      goodThreshold = t.ttfbGoodMs + locationLatency
      poorThreshold = t.ttfbGoodMs * 2 + locationLatency
      break
    default:
      return 'needs-improvement'
  }

  if (valueMs <= goodThreshold) return 'good'
  if (valueMs >= poorThreshold) return 'poor'
  return 'needs-improvement'
}

/**
 * Generate region-aware performance insights to append to the report.
 */
export function getRegionalInsights(ctx: AuditContext, ttfbMs?: number): string[] {
  const insights: string[] = []
  const loc = ctx.location
  const conn = ctx.connection

  // Location-based insight
  if (loc.ttfbAdjustMs > 0) {
    insights.push(loc.cdnInsight)
    insights.push(
      `Estimated additional latency for ${loc.label} users: ~${loc.ttfbAdjustMs}ms. ` +
      `Total expected RTT: ~${conn.expectedRttMs + loc.baselineLatencyMs}ms.`
    )
  }

  // Connection-based insight
  if (conn.throughputMbps < 5) {
    insights.push(
      `On ${conn.label} (${conn.throughputMbps} Mbps), large JavaScript bundles and unoptimized images ` +
      `will have a disproportionate impact on load times. Prioritize code-splitting and image compression.`
    )
  }

  // TTFB context
  if (ttfbMs !== undefined && loc.ttfbAdjustMs > 0) {
    const adjustedTtfb = ttfbMs + loc.ttfbAdjustMs
    insights.push(
      `Measured TTFB: ${ttfbMs}ms (from PSI's US origin). ` +
      `Estimated TTFB for ${loc.label} users: ~${adjustedTtfb}ms.`
    )
  }

  return insights
}
