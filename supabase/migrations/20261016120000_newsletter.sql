-- =============================================================================
-- WhatsApp AI Agent: newsletter list (run AFTER 20261016110000_referrals.sql).
-- Safe to run more than once.
--
-- People who asked for product news on the website. Double opt-in: only rows
-- with confirmed_at are on the list. Server-written and read only (service
-- role): RLS on with no policies and no grants for anon/authenticated.
-- =============================================================================

create table if not exists public.subscribers (
  id bigint generated always as identity primary key,
  email text not null unique check (email = lower(email) and char_length(email) <= 254),
  locale text not null default 'en' check (char_length(locale) <= 8),
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  confirm_sent_at timestamptz,
  confirmed_at timestamptz
);

alter table public.subscribers enable row level security;
revoke all on public.subscribers from anon, authenticated;
