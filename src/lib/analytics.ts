// ── Analytics Event Tracker ──
// Server-side fire-and-forget event logging to Supabase.
// All methods are non-blocking — errors are logged but never propagate.

import { supabase } from '@/lib/supabase'

// ── Event Types ──
export type AnalyticsEventType =
  | 'audit_run' | 'audit_success' | 'audit_fail'
  | 'audit_timeout' | 'audit_retry' | 'cache_hit'
  | 'psi_429' | 'invalid_url'
  | 'page_view' | 'session_start'
  | 'feature_use' | 'button_click'

export interface AnalyticsEvent {
  event_type: AnalyticsEventType
  user_id?: string | null
  ip_hash?: string
  metadata?: Record<string, any>
}

// ── Hash IP for privacy ──
async function hashIP(ip: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(ip + '_vitalfix_salt')
    const hash = await crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
  }
  // Fallback: simple hash
  let h = 0
  for (let i = 0; i < ip.length; i++) {
    h = ((h << 5) - h + ip.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(16).padStart(8, '0')
}

// ── Track a single event (fire-and-forget) ──
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  if (!supabase) return

  try {
    await supabase.from('analytics_events').insert({
      event_type: event.event_type,
      user_id: event.user_id || null,
      ip_hash: event.ip_hash || null,
      metadata: event.metadata || {},
    })
  } catch (e) {
    console.warn('[analytics] Event tracking failed:', (e as Error).message)
  }
}

// ── Track audit-specific event with IP ──
export async function trackAuditEvent(
  type: 'audit_run' | 'audit_success' | 'audit_fail' | 'audit_timeout' | 'audit_retry' | 'cache_hit' | 'invalid_url',
  ip: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  const ipHash = await hashIP(ip)
  trackEvent({ event_type: type, ip_hash: ipHash, metadata })
}

// ── Track batch of client events ──
export async function trackBatch(events: AnalyticsEvent[]): Promise<void> {
  if (!supabase || events.length === 0) return

  try {
    const rows = events.map(e => ({
      event_type: e.event_type,
      user_id: e.user_id || null,
      ip_hash: e.ip_hash || null,
      metadata: e.metadata || {},
    }))
    await supabase.from('analytics_events').insert(rows)
  } catch (e) {
    console.warn('[analytics] Batch tracking failed:', (e as Error).message)
  }
}

// ── Update daily aggregate counters ──
export async function updateDailyCounters(
  deltas: Partial<{
    total_audits: number
    successful: number
    failed: number
    partial: number
    avg_latency_ms: number
    cache_hits: number
    cache_misses: number
    retries: number
    timeouts: number
    api_failures: number
    invalid_urls: number
    page_views: number
  }>
): Promise<void> {
  if (!supabase) return

  const today = new Date().toISOString().slice(0, 10)

  try {
    // Try to get existing row
    const { data: existing } = await supabase
      .from('analytics_daily')
      .select('*')
      .eq('date', today)
      .single()

    if (existing) {
      // Update: increment counters
      const updates: Record<string, any> = { updated_at: new Date().toISOString() }
      for (const [key, delta] of Object.entries(deltas)) {
        if (key === 'avg_latency_ms' && delta) {
          // Running average: new_avg = (old_avg * old_count + new_value) / (old_count + 1)
          const oldCount = existing.total_audits || 1
          const oldAvg = existing.avg_latency_ms || 0
          updates.avg_latency_ms = Math.round((oldAvg * oldCount + delta) / (oldCount + (deltas.total_audits || 0)))
        } else {
          updates[key] = (existing[key] || 0) + (delta || 0)
        }
      }
      await supabase.from('analytics_daily').update(updates).eq('date', today)
    } else {
      // Insert new row for today
      await supabase.from('analytics_daily').insert({
        date: today,
        ...deltas,
      })
    }
  } catch (e) {
    console.warn('[analytics] Daily counter update failed:', (e as Error).message)
  }
}

// ── Get analytics summary for dashboard ──
export async function getAnalyticsSummary(days: number = 30): Promise<{
  daily: any[]
  totals: {
    totalAudits: number; successful: number; failed: number; partial: number
    avgLatency: number; cacheHits: number; cacheMisses: number
    retries: number; timeouts: number; apiFailures: number
    pageViews: number; invalidUrls: number
  }
  topDomains: { domain: string; count: number }[]
  errorBreakdown: Record<string, number>
} | null> {
  if (!supabase) return null

  try {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data: daily, error } = await supabase
      .from('analytics_daily')
      .select('*')
      .gte('date', since.toISOString().slice(0, 10))
      .order('date', { ascending: true })

    if (error || !daily) return null

    // Aggregate totals
    const totals = {
      totalAudits: 0, successful: 0, failed: 0, partial: 0,
      avgLatency: 0, cacheHits: 0, cacheMisses: 0,
      retries: 0, timeouts: 0, apiFailures: 0,
      pageViews: 0, invalidUrls: 0,
    }

    let latencySum = 0
    let latencyCount = 0
    const domainMap = new Map<string, number>()
    const errorMap: Record<string, number> = {}

    for (const d of daily) {
      totals.totalAudits += d.total_audits || 0
      totals.successful += d.successful || 0
      totals.failed += d.failed || 0
      totals.partial += d.partial || 0
      totals.cacheHits += d.cache_hits || 0
      totals.cacheMisses += d.cache_misses || 0
      totals.retries += d.retries || 0
      totals.timeouts += d.timeouts || 0
      totals.apiFailures += d.api_failures || 0
      totals.pageViews += d.page_views || 0
      totals.invalidUrls += d.invalid_urls || 0

      if (d.avg_latency_ms && d.total_audits) {
        latencySum += d.avg_latency_ms * d.total_audits
        latencyCount += d.total_audits
      }

      // Merge top domains
      if (Array.isArray(d.top_domains)) {
        for (const td of d.top_domains) {
          domainMap.set(td.domain, (domainMap.get(td.domain) || 0) + td.count)
        }
      }

      // Merge error breakdown
      if (d.error_breakdown && typeof d.error_breakdown === 'object') {
        for (const [errType, count] of Object.entries(d.error_breakdown)) {
          errorMap[errType] = (errorMap[errType] || 0) + (count as number)
        }
      }
    }

    totals.avgLatency = latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0

    const topDomains = Array.from(domainMap.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return { daily, totals, topDomains, errorBreakdown: errorMap }
  } catch (e) {
    console.warn('[analytics] Summary fetch failed:', (e as Error).message)
    return null
  }
}
