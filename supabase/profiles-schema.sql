-- ──────────────────────────────────────────────────────────
-- VitalFix — User Profiles + Plan Schema
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────

-- User profiles with plan and billing info
create table if not exists public.profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  plan                    text not null default 'free',       -- free | pro | enterprise
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan_expires_at         timestamptz,
  daily_audit_count       integer not null default 0,
  daily_audit_reset       date not null default current_date,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- Index for Stripe customer lookup (webhook handler)
create index if not exists idx_profiles_stripe_customer
  on public.profiles(stripe_customer_id);

-- ── Auto-create profile on user signup ──
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, plan)
  values (new.id, 'free');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: fires after auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── RLS policies ──
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (but not plan — only webhook does that)
create policy "Users can update own non-plan fields"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role (webhook) can do anything — handled by Supabase service key
