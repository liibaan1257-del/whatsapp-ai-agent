-- =============================================================================
-- WhatsApp AI Agent: plans and manual billing (run AFTER 20261012100000_twilio.sql).
-- Safe to run more than once.
--
-- Customers pay the operator directly (Mobile Money, Waafi, bank transfer, …);
-- the operator then extends their access on the Admin page.
--
--   * business_knowledge.plan          'trial' | 'starter' | 'pro'
--   * business_knowledge.access_until  AI replies stop after this moment
--   * profiles.is_platform_admin       who may open the Admin page
--
-- Owners can READ these (to see their plan) but never change them: there is
-- no column grant, so only the server (service role) writes them.
-- =============================================================================

alter table public.business_knowledge
  add column if not exists plan text not null default 'trial' check (plan in ('trial', 'starter', 'pro')),
  add column if not exists access_until timestamptz not null default (now() + interval '14 days');

alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

-- Monthly AI reply count per business (quota check on every message).
create index if not exists messages_business_assistant_idx
  on public.messages (business_id, created_at)
  where role = 'assistant';

-- Make yourself the admin (once, with your own email):
--   update public.profiles set is_platform_admin = true where email = 'you@example.com';
