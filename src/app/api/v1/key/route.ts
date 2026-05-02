// ── API Key Management ──
// POST: Generate a new API key (requires Supabase session auth)
// DELETE: Revoke existing API key

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createApiKey, revokeApiKey } from '@/lib/api-auth'
import { PLANS, type PlanTier } from '@/lib/plans'

function getSupabaseClient(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
        setAll: () => {},
      },
    }
  )
}

// POST /api/v1/key — Generate API key
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient(req)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Sign in first.' },
        { status: 401 }
      )
    }

    // Check plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, api_key')
      .eq('id', user.id)
      .single()

    const plan = (profile?.plan as PlanTier) || 'free'
    const config = PLANS[plan] || PLANS.free

    if (config.apiDailyLimit === 0) {
      return NextResponse.json(
        {
          error: `API access requires Pro ($${PLANS.pro.monthlyPrice}/mo) or Enterprise plan.`,
          currentPlan: config.name,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      )
    }

    if (profile?.api_key) {
      return NextResponse.json(
        {
          error: 'API key already exists. Revoke the current key first (DELETE /api/v1/key).',
          hasKey: true,
        },
        { status: 409 }
      )
    }

    const key = await createApiKey(user.id)
    if (!key) {
      return NextResponse.json(
        { error: 'Failed to generate API key.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      apiKey: key,
      plan: config.name,
      dailyLimit: config.apiDailyLimit,
      note: 'Save this key securely — it cannot be retrieved again. Only the last 4 characters are shown in the dashboard.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API Key] POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/v1/key — Revoke API key
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseClient(req)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      )
    }

    const success = await revokeApiKey(user.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to revoke API key.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ revoked: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API Key] DELETE error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
