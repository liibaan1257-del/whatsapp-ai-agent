-- =============================================================================
-- WhatsApp AI Agent: owner-requested WhatsApp connections
-- (run AFTER 20261015100000_webhook_events.sql). Safe to run more than once.
--
--   * business_knowledge.wa_request_number / wa_requested_at
--       The number an owner asked us to connect, and when. Server-written only.
--   * The WhatsApp routing columns (whatsapp_phone_number_id,
--     twilio_whatsapp_number) are now set by the operator (service role) only:
--     an owner could otherwise point their business at another business's number.
-- =============================================================================

alter table public.business_knowledge
  add column if not exists wa_request_number text check (wa_request_number ~ '^\+[1-9][0-9]{7,14}$'),
  add column if not exists wa_requested_at timestamptz;

revoke update (whatsapp_phone_number_id, twilio_whatsapp_number) on public.business_knowledge from authenticated;
