// ── Plan Definitions & Quota System ──
// Centralised plan config, quota checking, and Stripe price mapping.

import { supabase } from '@/lib/supabase'

// ── Plan Tiers ──

export type PlanTier = 'free' | 'pro' | 'enterprise'

export interface PlanConfig {
  name: string
  tier: PlanTier
  dailyAuditLimit: number       // -1 = unlimited
  historyRetentionDays: number  // -1 = unlimited
  features: string[]
  monthlyPrice: number          // in dollars, 0 = free
  yearlyPrice: number
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    name: 'Free',
    tier: 'free',
    dailyAuditLimit: 3,
    historyRetentionDays: 7,
    features: [
      'Basic Lighthouse audit',
      'Core Web Vitals report',
      '3 audits per day',
      '7-day history',
    ],
    monthlyPrice: 0,
    yearlyPrice: 0,
  },
  pro: {
    name: 'Pro',
    tier: 'pro',
    dailyAuditLimit: -1, // unlimited
    historyRetentionDays: -1,
    features: [
      'Unlimited audits',
      'Full site audit engine',
      'Unlimited history',
      'PDF report export',
      'Priority support',
    ],
    monthlyPrice: 9,
    yearlyPrice: 89,
  },
  enterprise: {
    name: 'Enterprise',
    tier: 'enterprise',
    dailyAuditLimit: -1,
    historyRetentionDays: -1,
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Scheduled monitoring',
      'API access',
      'Custom integrations',
      'Dedicated support',
    ],
    monthlyPrice: 0, // custom pricing
    yearlyPrice: 0,
  },
}

// ── Stripe Price IDs (set in env) ──

export const STRIPE_PRICES = {
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
  const config = PLANS[plan]
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
