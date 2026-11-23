-- ============================================================================
-- ChangeIt4Me (exchange) — Supabase Cloud Database Schema (/api/sync)
-- Run this once in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

create table if not exists public.ci4m_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Insert initial singleton state row if not present
insert into public.ci4m_state (id, payload, updated_at)
values ('main', '{}'::jsonb, now())
on conflict (id) do nothing;

-- Enable Row Level Security (accessed via server-side SUPABASE_SERVICE_ROLE_KEY in /api/sync)
alter table public.ci4m_state enable row level security;

create policy "Allow service role full access on ci4m_state"
  on public.ci4m_state
  for all
  using (true)
  with check (true);
