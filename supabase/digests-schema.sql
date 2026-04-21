-- ──────────────────────────────────────────────────────────
-- VitalFix — Digests Schema
-- Stores weekly/monthly performance digest data for users.
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

create table if not exists public.digests (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  digest_type text not null default 'weekly',        -- 'weekly', 'monthly'
  data        jsonb not null default '{}',            -- { url, currentScore, previousScore, delta, topIssue, recommendation }
  sent        boolean default false,
  created_at  timestamptz default now()
);

create index if not exists idx_digests_user on public.digests(user_id);
create index if not exists idx_digests_created on public.digests(created_at desc);

-- ── RLS Policies ──
alter table public.digests enable row level security;

-- Users can only read their own digests
create policy "Users can read own digests"
  on public.digests for select
  using (auth.uid() = user_id);

-- Service role inserts digests (cron job)
create policy "Service role can insert digests"
  on public.digests for insert
  with check (true);
