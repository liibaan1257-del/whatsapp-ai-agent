-- =============================================================================
-- WhatsApp AI Agent: referrals (run AFTER 20261016100000_whatsapp_requests.sql).
-- Safe to run more than once.
--
--   * business_knowledge.referral_code         the business's invite code (/signup?ref=…)
--   * business_knowledge.referred_by           the business whose link was used to sign up
--   * business_knowledge.referral_rewarded_at  when the referrer got its free month
--     (set once, the first time this business pays)
-- All three are server-written only (no owner update grant).
-- =============================================================================

alter table public.business_knowledge
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.business_knowledge (id) on delete set null,
  add column if not exists referral_rewarded_at timestamptz;

alter table public.business_knowledge
  alter column referral_code set default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

update public.business_knowledge
  set referral_code = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  where referral_code is null;

alter table public.business_knowledge alter column referral_code set not null;

create unique index if not exists business_knowledge_referral_code_key on public.business_knowledge (referral_code);
create index if not exists business_knowledge_referred_by_idx on public.business_knowledge (referred_by);
