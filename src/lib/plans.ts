// ── Plan Definitions & Quota System ──
// Centralised plan config, quota checking, and Stripe price mapping.
// 4-Tier Structure: Free → Starter → Pro → Enterprise

import { supabase } from '@/lib/supabase'

// ── Plan Tiers ──

export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise'

export interface PlanConfig {
  name: string
  tier: PlanTier
  dailyAuditLimit: number       // -1 = unlimited
  historyRetentionDays: number  // -1 = unlimited
  batchUrlLimit: number         // max URLs per batch audit
  shareableReportsLimit: number // -1 = unlimited, else per month
  pdfExportLimit: number        // -1 = unlimited, else per month
  apiDailyLimit: number         // 0 = no API access, else requests/day
  features: string[]
  monthlyPrice: number          // in dollars, 0 = free, -1 = custom
  yearlyPrice: number           // in dollars, 0 = free, -1 = custom
  color: string                 // brand color for badges/UI
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    name: 'Free',
    tier: 'free',
    dailyAuditLimit: 5,
    historyRetentionDays: 7,
    batchUrlLimit: 1,
    shareableReportsLimit: 3,
    pdfExportLimit: 0,
    apiDailyLimit: 0,
    features: [
      '5 audits per day',
      'Full Lighthouse audit',
      '8-module site audit',
      'Core Web Vitals + CrUX',
      'Code snippet library',
      '7-day scan history (15 scans)',
      '3 shareable reports/month',
    ],
    monthlyPrice: 0,
    yearlyPrice: 0,
    color: '#34d399',
  },
  starter: {
    name: 'Starter',
    tier: 'starter',
    dailyAuditLimit: 25,
    historyRetentionDays: 90,
    batchUrlLimit: 3,
    shareableReportsLimit: -1,
    pdfExportLimit: 10,
    apiDailyLimit: 0,
    features: [
      '25 audits per day',
      '90-day scan history',
      'Trend tracking with sparklines',
      'PDF report export (10/mo)',
      'CSV/JSON data export',
      'Batch audit (3 URLs)',
      'Full analytics dashboard',
      'Email support (48hr)',
    ],
    monthlyPrice: 5,
    yearlyPrice: 48,
    color: '#38bdf8',
  },
  pro: {
    name: 'Pro',
    tier: 'pro',
    dailyAuditLimit: -1, // unlimited
    historyRetentionDays: -1,
    batchUrlLimit: 10,
    shareableReportsLimit: -1,
    pdfExportLimit: -1,
    apiDailyLimit: 1000,
    features: [
      'Unlimited audits',
      'Unlimited scan history',
      'Scheduled monitoring (10 URLs)',
      'Performance budgets & alerts',
      'Competitor benchmarking',
      'REST API (1K req/day)',
      'CI/CD CLI + GitHub Action',
      'Priority processing',
    ],
    monthlyPrice: 19,
    yearlyPrice: 179,
    color: '#818cf8',
  },
  enterprise: {
    name: 'Enterprise',
    tier: 'enterprise',
    dailyAuditLimit: -1,
    historyRetentionDays: 730, // 2 years
    batchUrlLimit: 50,
    shareableReportsLimit: -1,
    pdfExportLimit: -1,
    apiDailyLimit: 10000,
    features: [
      'Everything in Pro',
      'Unlimited site monitoring',
      'Team seats (5 included)',
      'White-label PDF reports',
      'REST API (10K req/day)',
      'Custom integrations',
      'SSO + invoice billing',
      'Dedicated account manager',
    ],
    monthlyPrice: -1, // custom pricing
    yearlyPrice: -1,
    color: '#60a5fa',
  },
}

// ── Stripe Price IDs (set in env) ──

export const STRIPE_PRICES = {
  starter_monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || '',
  starter_yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || '',
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
  pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || '',
}

// ── Profile Type ──

export interface UserProfile {
  id: string
  plan: PlanTier
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  planExpiresAt: string | null
  dailyAuditCount: number
  dailyAuditReset: string
  apiKey: string | null
  apiDailyCount: number
  apiDailyReset: string
}

// ── Get User Profile ──

export async function getProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    plan: data.plan as PlanTier,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    planExpiresAt: data.plan_expires_at,
    dailyAuditCount: data.daily_audit_count,
    dailyAuditReset: data.daily_audit_reset,
    apiKey: data.api_key || null,
    apiDailyCount: data.api_daily_count || 0,
    apiDailyReset: data.api_daily_reset || new Date().toISOString().slice(0, 10),
  }
}

// ── Check Quota ──

export interface QuotaResult {
  allowed: boolean
  used: number
  limit: number      // -1 = unlimited
  remaining: number  // -1 = unlimited
  plan: PlanTier
}

export async function checkQuota(userId: string): Promise<QuotaResult> {
  const profile = await getProfile(userId)

  // No profile = treat as free
  const plan = profile?.plan || 'free'
  const config = PLANS[plan] || PLANS.free
  const limit = config.dailyAuditLimit

  // Unlimited plans
  if (limit === -1) {
    return { allowed: true, used: 0, limit: -1, remaining: -1, plan }
  }

  // Check if daily counter needs reset
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  let used = profile?.dailyAuditCount || 0

  if (profile?.dailyAuditReset !== today) {
    // Reset counter for new day
    used = 0
    if (supabase && profile) {
      await supabase
        .from('profiles')
        .update({ daily_audit_count: 0, daily_audit_reset: today })
        .eq('id', userId)
    }
  }

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    plan,
  }
}

// ── Increment Audit Counter ──

export async function incrementAuditCount(userId: string): Promise<void> {
  if (!supabase) return

  const today = new Date().toISOString().slice(0, 10)
  const profile = await getProfile(userId)

  if (profile?.dailyAuditReset === today) {
    // Same day — increment
    await supabase
      .from('profiles')
      .update({ daily_audit_count: (profile.dailyAuditCount || 0) + 1 })
      .eq('id', userId)
  } else {
    // New day — reset to 1
    await supabase
      .from('profiles')
      .update({ daily_audit_count: 1, daily_audit_reset: today })
      .eq('id', userId)
  }
}

// ── Upsert Profile (used by webhook) ──

export async function upsertProfile(
  userId: string,
  updates: Partial<{
    plan: PlanTier
    stripe_customer_id: string
    stripe_subscription_id: string
    plan_expires_at: string
  }>
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })

  if (error) {
    console.error('[Plans] Failed to upsert profile:', error.message)
  }
}

// ── Helpers ──

/** Get the next tier upgrade from current plan */
export function getUpgradeTier(current: PlanTier): PlanTier | null {
  const order: PlanTier[] = ['free', 'starter', 'pro', 'enterprise']
  const idx = order.indexOf(current)
  return idx < order.length - 1 ? order[idx + 1] : null
}

/** Get human-readable upgrade message */
export function getUpgradeMessage(plan: PlanTier): string {
  const next = getUpgradeTier(plan)
  if (!next) return ''
  const nextConfig = PLANS[next]
  const price = nextConfig.monthlyPrice === -1 ? 'Custom pricing' : `$${nextConfig.monthlyPrice}/mo`
  return `Upgrade to ${nextConfig.name} (${price}) for ${next === 'starter' ? '25 audits/day + PDF export' : next === 'pro' ? 'unlimited audits + monitoring' : 'team features + white-label'}`
}
