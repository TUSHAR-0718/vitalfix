-- ──────────────────────────────────────────────────────────
-- VitalFix — API Keys Schema (add to profiles)
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

-- Add API key columns to existing profiles table
alter table public.profiles
  add column if not exists api_key           text unique,
  add column if not exists api_key_created_at timestamptz,
  add column if not exists api_daily_count    integer not null default 0,
  add column if not exists api_daily_reset    date not null default current_date;

-- Index for fast API key lookups (used on every API request)
create index if not exists idx_profiles_api_key
  on public.profiles(api_key)
  where api_key is not null;
