// ── Lead Capture API ──
// POST /api/leads — stores email leads from audit modal, exit-intent, footer, etc.
// Rate limited: 5 submissions per IP per hour.

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { trackEvent } from '@/lib/analytics'

// ── In-memory rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW = 3600_000 // 1 hour

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

// ── Hash IP for privacy ──
async function hashIP(ip: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(ip + '_vitalfix_leads_salt')
    const hash = await crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
  }
  let h = 0
  for (let i = 0; i < ip.length; i++) {
    h = ((h << 5) - h + ip.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(16).padStart(8, '0')
}

// ── Email validation ──
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 }
    )
  }

  let body: { email?: string; source?: string; url_audited?: string; metadata?: Record<string, any> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, source, url_audited, metadata } = body

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const validSources = ['audit_modal', 'exit_intent', 'footer', 'guide_cta']
  if (!source || !validSources.includes(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }

  const ipHash = await hashIP(ip)

  // Store lead in Supabase
  if (supabase) {
    try {
      await supabase.from('leads').insert({
        email: email.toLowerCase().trim(),
        source,
        url_audited: url_audited || null,
        ip_hash: ipHash,
        metadata: metadata || {},
      })
    } catch (e) {
      console.error('[leads] Insert failed:', (e as Error).message)
      // Don't fail the request if Supabase is down
    }
  }

  // Track analytics event (fire-and-forget)
  trackEvent({
    event_type: 'feature_use',
    ip_hash: ipHash,
    metadata: { action: 'lead_captured', source, url_audited },
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
