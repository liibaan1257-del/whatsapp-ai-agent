-- =============================================================================
-- WhatsApp AI Agent: Twilio as a second WhatsApp provider
-- (run AFTER 20261011100000_global.sql). Safe to run more than once.
--
--   * business_knowledge.twilio_whatsapp_number  the business's WhatsApp number
--     on Twilio (E.164, e.g. +14155238886); routes Twilio messages to it.
--   * conversations.provider  which provider the customer wrote through
--     ('meta' or 'twilio'), so replies sent later go back the same way.
-- =============================================================================

alter table public.business_knowledge
  add column if not exists twilio_whatsapp_number text unique check (twilio_whatsapp_number ~ '^\+[1-9][0-9]{6,14}$');

alter table public.conversations
  add column if not exists provider text check (provider in ('meta', 'twilio'));

-- Owners may set their Twilio number (column-level grant, like the others).
-- conversations.provider is written by the server only (no grant).
grant update (twilio_whatsapp_number) on public.business_knowledge to authenticated;
