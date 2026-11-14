-- The owner's own WhatsApp number, given (optionally) at signup so the operator
-- can reach new owners and help them set up. Digits only, with the country code
-- (E.164 without the plus). Written only by the server (service role): no
-- column grant to authenticated, so owners can't change it through the API.
alter table public.business_knowledge
  add column if not exists owner_whatsapp text
    check (owner_whatsapp is null or owner_whatsapp ~ '^[1-9][0-9]{6,14}$');
