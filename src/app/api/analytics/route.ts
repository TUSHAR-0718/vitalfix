// ── Client Analytics Event Endpoint ──
// POST /api/analytics — accepts batched events from the browser

import { NextRequest, NextResponse } from 'next/server'
import { trackBatch, type AnalyticsEvent } from '@/lib/analytics'

// Allowlisted event types from client
const ALLOWED_TYPES = new Set([
  'page_view', 'session_start', 'feature_use', 'button_click',
])

// Simple rate limiter
const rateMap = new Map<string, { count: number; resetAt: number }>()

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  // Rate limit: 20 events/min per IP
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (entry && now < entry.resetAt && entry.count >= 20) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }
  if (!entry || now >= entry.resetAt) {
    rateMap.set(ip, { count: 0, resetAt: now + 60_000 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const events: AnalyticsEvent[] = Array.isArray(body.events) ? body.events : []
  if (events.length === 0) {
    return NextResponse.json({ error: 'No events' }, { status: 400 })
  }

  // Filter to allowed types, cap at 20 per batch
  const filtered = events
    .filter(e => ALLOWED_TYPES.has(e.event_type))
    .slice(0, 20)

  if (filtered.length === 0) {
    return NextResponse.json({ error: 'No valid events' }, { status: 400 })
  }

  // Update rate counter
  const r = rateMap.get(ip)!
  r.count += filtered.length

  // Fire and forget
  trackBatch(filtered).catch(() => {})

  return NextResponse.json({ tracked: filtered.length })
}
