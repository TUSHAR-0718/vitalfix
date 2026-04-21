// ── UTM & Referral Tracking ──
// Captures UTM parameters on first page load and attaches them to all analytics events.
// Stored in sessionStorage so they persist across page navigations within the session.

const UTM_STORAGE_KEY = 'vitalfix-utm'

export interface UTMData {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  referrer: string | null
  landing_page: string | null
  captured_at: string
}

/**
 * Captures UTM params from the current URL on first page load.
 * Call this once on app mount. Safe to call multiple times (no-op if already captured).
 */
export function captureUTM(): UTMData | null {
  if (typeof window === 'undefined') return null

  // Already captured this session
  const existing = sessionStorage.getItem(UTM_STORAGE_KEY)
  if (existing) {
    try { return JSON.parse(existing) } catch { /* continue */ }
  }

  const params = new URLSearchParams(window.location.search)

  const data: UTMData = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    referrer: document.referrer || null,
    landing_page: window.location.pathname,
    captured_at: new Date().toISOString(),
  }

  // Only store if at least one UTM param or a referrer exists
  const hasData = data.utm_source || data.utm_medium || data.utm_campaign || data.referrer
  if (hasData) {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(data))
    return data
  }

  return null
}

/**
 * Gets stored UTM data for the current session.
 * Useful for attaching to analytics events and lead captures.
 */
export function getUTM(): UTMData | null {
  if (typeof window === 'undefined') return null

  const stored = sessionStorage.getItem(UTM_STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Returns UTM data as a flat metadata object suitable for analytics events.
 */
export function getUTMMetadata(): Record<string, string> {
  const utm = getUTM()
  if (!utm) return {}

  const meta: Record<string, string> = {}
  if (utm.utm_source) meta.utm_source = utm.utm_source
  if (utm.utm_medium) meta.utm_medium = utm.utm_medium
  if (utm.utm_campaign) meta.utm_campaign = utm.utm_campaign
  if (utm.utm_content) meta.utm_content = utm.utm_content
  if (utm.utm_term) meta.utm_term = utm.utm_term
  if (utm.referrer) meta.referrer = utm.referrer
  if (utm.landing_page) meta.landing_page = utm.landing_page
  return meta
}
