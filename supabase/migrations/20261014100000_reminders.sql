-- =============================================================================
-- WhatsApp AI Agent: appointment reminders (run AFTER 20261013100000_billing.sql).
-- Safe to run more than once.
--
--   * bookings.reminder_status / reminder_at   set by the daily reminder job
--     ('sent' | 'failed' | 'skipped'); server-written only.
--   * business_knowledge.reminders_enabled      owner switch
--   * business_knowledge.reminder_template(_lang)  Meta template used when the
--     customer's last message is older than 24 hours (WhatsApp only allows
--     free text inside that window).
-- =============================================================================

alter table public.bookings
  add column if not exists reminder_status text check (reminder_status in ('sent', 'failed', 'skipped')),
  add column if not exists reminder_at timestamptz;

alter table public.business_knowledge
  add column if not exists reminders_enabled boolean not null default true,
  add column if not exists reminder_template text not null default 'appointment_reminder'
    check (reminder_template ~ '^[a-z0-9_]+$' and char_length(reminder_template) <= 512),
  add column if not exists reminder_template_lang text not null default 'en'
    check (reminder_template_lang ~ '^[a-z]{2,3}(_[A-Z]{2})?$');

grant update (reminders_enabled, reminder_template, reminder_template_lang) on public.business_knowledge to authenticated;

-- The job looks for confirmed bookings in the next day that have no reminder yet.
create index if not exists bookings_reminder_due_idx
  on public.bookings (date_time)
  where status = 'confirmed' and reminder_status is null;
