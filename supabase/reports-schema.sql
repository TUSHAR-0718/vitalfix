-- ──────────────────────────────────────────────────────────
-- VitalFix — Public Reports Schema
-- Shareable, read-only audit summaries for viral distribution.
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

create table if not exists public.public_reports (
  id             text primary key,        -- short nanoid (8 chars)
  url            text not null,
  strategy       text not null default 'mobile',
  health_score   integer,
  scores         jsonb,                   -- { performance, accessibility, bestPractices, seo }
  cwv_summary    jsonb,                   -- { lcp, inp, cls, fcp, ttfb }
  top_issues     jsonb default '[]',      -- top 3 issues for the summary card
  custom_audit   jsonb,                   -- { overallScore, totalFindings, critical, moderate, minor }
  created_by     uuid references auth.users(id) on delete set null,
  view_count     integer default 0,
  created_at     timestamptz default now()
);

create index if not exists idx_reports_created on public.public_reports(created_at desc);
create index if not exists idx_reports_url on public.public_reports(url);

-- ── RLS Policies ──
alter table public.public_reports enable row level security;

-- Anyone can read public reports (they are intentionally public)
create policy "Anyone can read public reports"
  on public.public_reports for select
  using (true);

-- Authenticated users can create reports
create policy "Authenticated users can create reports"
  on public.public_reports for insert
  with check (true);

-- Allow incrementing view counts (anyone)
create policy "Anyone can update view count"
  on public.public_reports for update
  using (true)
  with check (true);
