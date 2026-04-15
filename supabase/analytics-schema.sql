-- ──────────────────────────────────────────────────────────
-- VitalFix — Analytics Schema
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

-- ── Raw event log ──
-- Every trackable action: audits, page views, clicks, errors
create table if not exists public.analytics_events (
  id          bigserial primary key,
  event_type  text not null,               -- audit_run, audit_success, audit_fail, page_view, click, etc.
  user_id     uuid references auth.users(id) on delete set null,  -- nullable for anonymous
  ip_hash     text,                        -- SHA256 of IP (privacy-safe)
  metadata    jsonb default '{}',          -- flexible event data
  created_at  timestamptz default now()
);

create index if not exists idx_events_type on public.analytics_events(event_type);
create index if not exists idx_events_created on public.analytics_events(created_at desc);
create index if not exists idx_events_user on public.analytics_events(user_id);

-- ── Pre-aggregated daily counters ──
-- Avoids expensive COUNT(*) on large event tables
create table if not exists public.analytics_daily (
  date              date primary key,
  total_audits      integer default 0,
  successful        integer default 0,
  failed            integer default 0,
  partial           integer default 0,
  avg_latency_ms    integer default 0,
  cache_hits        integer default 0,
  cache_misses      integer default 0,
  retries           integer default 0,
  timeouts          integer default 0,
  api_failures      integer default 0,
  invalid_urls      integer default 0,
  unique_domains    integer default 0,
  unique_users      integer default 0,
  page_views        integer default 0,
  top_domains       jsonb default '[]',       -- [{domain, count}]
  error_breakdown   jsonb default '{}',       -- {timeout: N, psi_fail: N, ...}
  updated_at        timestamptz default now()
);

-- ── RLS Policies ──

alter table public.analytics_events enable row level security;
alter table public.analytics_daily enable row level security;

-- Anyone can INSERT events (including anonymous via API)
create policy "Anyone can insert events"
  on public.analytics_events for insert
  with check (true);

-- Users can read only their own events
create policy "Users read own events"
  on public.analytics_events for select
  using (auth.uid() = user_id);

-- Daily aggregates: readable by all authenticated users
create policy "Authenticated users read daily stats"
  on public.analytics_daily for select
  using (auth.role() = 'authenticated');

-- Server can insert/update daily stats (via service role, bypasses RLS)
-- No insert/update policy needed because service role bypasses RLS
