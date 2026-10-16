-- =============================================================================
-- WhatsApp AI Agent: monthly results email (run AFTER 20261016120000_newsletter.sql).
-- Safe to run more than once.
--
--   * business_knowledge.monthly_report_for  'YYYY-MM' of the last month whose
--     results email was sent, so a re-run of the daily job never sends twice.
--     Server-written only.
-- =============================================================================

alter table public.business_knowledge
  add column if not exists monthly_report_for text check (monthly_report_for ~ '^\d{4}-\d{2}$');
