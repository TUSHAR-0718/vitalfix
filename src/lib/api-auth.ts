// ── API Key Authentication & Rate Limiting ──
// Validates Bearer token, resolves user profile, and enforces API quota.
// Used by all /api/v1/* routes.

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { PLANS, type PlanTier, type UserProfile } from '@/lib/plans'
import type { SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// ── Types ──

export interface ApiAuthResult {
  user: UserProfile
  plan: PlanTier
  apiUsed: number
  apiLimit: number
  apiRemaining: number
}

export interface ApiErrorResponse {
  error: string
  code: string
  status: number
}

// ── Authenticate API Request ──

export async function authenticateApiRequest(
  req: NextRequest
): Promise<ApiAuthResult | ApiErrorResponse> {
  // Extract Bearer token
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: 'Missing or invalid Authorization header. Use: Bearer <api_key>',
      code: 'AUTH_MISSING',
      status: 401,
    }
  }

  const apiKey = authHeader.slice(7).trim()
  if (!apiKey || apiKey.length < 20) {
    return {
      error: 'Invalid API key format.',
      code: 'AUTH_INVALID',
      status: 401,
    }
  }

  // Look up API key in profiles
  if (!supabase) {
    return {
      error: 'Database not configured.',
      code: 'SERVER_ERROR',
      status: 503,
    }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('api_key', apiKey)
    .single()

  if (error || !profile) {
    return {
      error: 'Invalid API key. Generate one at /dashboard → Settings.',
      code: 'AUTH_INVALID_KEY',
      status: 401,
    }
  }

  const plan = (profile.plan as PlanTier) || 'free'
  const config = PLANS[plan] || PLANS.free

  // Check if plan has API access
  if (config.apiDailyLimit === 0) {
    return {
      error: `API access requires Pro ($${PLANS.pro.monthlyPrice}/mo) or Enterprise plan. Current plan: ${config.name}`,
      code: 'PLAN_NO_API',
      status: 403,
    }
  }

  // Check daily API rate limit
  const today = new Date().toISOString().slice(0, 10)
  let apiUsed = profile.api_daily_count || 0

  if (profile.api_daily_reset !== today) {
    // New day — reset counter
    apiUsed = 0
    await supabase
      .from('profiles')
      .update({ api_daily_count: 0, api_daily_reset: today })
      .eq('id', profile.id)
  }

  if (apiUsed >= config.apiDailyLimit) {
    return {
      error: `API rate limit exceeded. ${config.apiDailyLimit} requests/day on ${config.name} plan. Resets at midnight UTC.`,
      code: 'RATE_LIMIT',
      status: 429,
    }
  }

  // Increment API counter
  await supabase
    .from('profiles')
    .update({ api_daily_count: apiUsed + 1, api_daily_reset: today })
    .eq('id', profile.id)

  const user: UserProfile = {
    id: profile.id,
    plan,
    stripeCustomerId: profile.stripe_customer_id,
    stripeSubscriptionId: profile.stripe_subscription_id,
    planExpiresAt: profile.plan_expires_at,
    dailyAuditCount: profile.daily_audit_count,
    dailyAuditReset: profile.daily_audit_reset,
    apiKey: profile.api_key,
    apiDailyCount: apiUsed + 1,
    apiDailyReset: today,
  }

  return {
    user,
    plan,
    apiUsed: apiUsed + 1,
    apiLimit: config.apiDailyLimit,
    apiRemaining: config.apiDailyLimit - (apiUsed + 1),
  }
}

// ── Helper: Check if auth result is an error ──

export function isApiError(
  result: ApiAuthResult | ApiErrorResponse
): result is ApiErrorResponse {
  return 'error' in result
}

// ── Helper: Create error response with rate limit headers ──

export function apiErrorResponse(err: ApiErrorResponse): NextResponse {
  return NextResponse.json(
    { error: err.error, code: err.code },
    {
      status: err.status,
      headers: {
        'X-RateLimit-Error': err.code,
      },
    }
  )
}

// ── Helper: Add rate limit headers to success response ──

export function withRateLimitHeaders(
  response: NextResponse,
  auth: ApiAuthResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(auth.apiLimit))
  response.headers.set('X-RateLimit-Used', String(auth.apiUsed))
  response.headers.set('X-RateLimit-Remaining', String(auth.apiRemaining))
  return response
}

// ── Generate API Key ──

export function generateApiKey(): string {
  const prefix = 'vf_'
  const random = crypto.randomBytes(24).toString('base64url')
  return `${prefix}${random}`
}

// ── Save API Key to Profile ──
// Accepts an optional authenticated Supabase client for RLS-compliant updates.
// When called from route handlers, pass the session-authenticated server client.

export async function createApiKey(
  userId: string,
  client?: SupabaseClient
): Promise<string | null> {
  const db = client || supabase
  if (!db) return null

  const key = generateApiKey()

  const { error } = await db
    .from('profiles')
    .update({
      api_key: key,
      api_key_created_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    console.error('[API Key] Failed to save:', error.message)
    return null
  }

  return key
}

// ── Revoke API Key ──
// Accepts an optional authenticated Supabase client for RLS-compliant updates.

export async function revokeApiKey(
  userId: string,
  client?: SupabaseClient
): Promise<boolean> {
  const db = client || supabase
  if (!db) return false

  const { error } = await db
    .from('profiles')
    .update({
      api_key: null,
      api_key_created_at: null,
      api_daily_count: 0,
    })
    .eq('id', userId)

  return !error
}
