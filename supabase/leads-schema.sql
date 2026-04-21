-- ──────────────────────────────────────────────────────────
-- VitalFix — Leads Schema
-- Captures emails from free audit funnel, exit-intent, etc.
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

create table if not exists public.leads (
  id          bigserial primary key,
  email       text not null,
  source      text not null,           -- 'audit_modal', 'exit_intent', 'footer'
  url_audited text,                    -- the URL they were auditing (if applicable)
  ip_hash     text,                    -- SHA256(IP) for rate limiting
  converted   boolean default false,   -- did they later sign up?
  metadata    jsonb default '{}',      -- health_score, device, referrer, etc.
  created_at  timestamptz default now()
);

create index if not exists idx_leads_email on public.leads(email);
create index if not exists idx_leads_source on public.leads(source);
create index if not exists idx_leads_created on public.leads(created_at desc);

-- ── RLS Policies ──
alter table public.leads enable row level security;

-- Anyone can insert leads (anonymous visitors via API)
create policy "Anyone can insert leads"
  on public.leads for insert
  with check (true);

-- Only service role can read leads (admin dashboard, bypasses RLS)
-- No select policy = no user-facing reads
