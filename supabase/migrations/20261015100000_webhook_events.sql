-- =============================================================================
-- WhatsApp AI Agent: webhook delivery log (run AFTER 20261014100000_reminders.sql).
-- Safe to run more than once.
--
-- One row per notable webhook outcome (bad signature, unknown number, reply
-- sent or failed) so the operator can see why a message got no answer without
-- access to the hosting logs. No message text or secrets are stored.
-- Server-written only: RLS on with no policies, so only the service role reads it.
-- =============================================================================

create table if not exists public.webhook_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  outcome text not null check (char_length(outcome) <= 64),
  detail text check (char_length(detail) <= 500)
);

alter table public.webhook_events enable row level security;
revoke all on public.webhook_events from anon, authenticated;

create index if not exists webhook_events_created_idx on public.webhook_events (created_at desc);
