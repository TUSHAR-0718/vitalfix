// ── Live Stats API ──
// GET /api/stats/live — returns real-time platform stats for social proof widget.
// Cached for 60 seconds to avoid hammering the database.

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ── In-memory cache ──
let cachedStats: { auditsToday: number; totalAudits: number; reportsShared: number } | null = null
let lastFetch = 0
const CACHE_TTL = 60_000 // 60 seconds

export async function GET() {
  const now = Date.now()

  // Return cached if fresh
  if (cachedStats && now - lastFetch < CACHE_TTL) {
    return NextResponse.json(cachedStats, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  }

  // Default values if Supabase is unavailable
  let auditsToday = 0
  let totalAudits = 0
  let reportsShared = 0

  if (supabase) {
    try {
      const today = new Date().toISOString().slice(0, 10)

      // Today's audit count
      const { data: todayData } = await supabase
        .from('analytics_daily')
        .select('total_audits')
        .eq('date', today)
        .single()

      auditsToday = todayData?.total_audits || 0

      // All-time total audits (sum last 365 days)
      const since = new Date()
      since.setDate(since.getDate() - 365)
      const { data: allData } = await supabase
        .from('analytics_daily')
        .select('total_audits')
        .gte('date', since.toISOString().slice(0, 10))

      totalAudits = allData?.reduce((sum, d) => sum + (d.total_audits || 0), 0) || 0

      // Reports shared
      const { count } = await supabase
        .from('public_reports')
        .select('id', { count: 'exact', head: true })

      reportsShared = count || 0
    } catch (e) {
      console.warn('[stats] Failed to fetch live stats:', (e as Error).message)
    }
  }

  const stats = { auditsToday, totalAudits, reportsShared }
  cachedStats = stats
  lastFetch = now

  return NextResponse.json(stats, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
