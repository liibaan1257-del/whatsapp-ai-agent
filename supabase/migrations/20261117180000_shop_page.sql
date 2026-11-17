-- Public shop page (replybooker.com/s/<slug>) and the WhatsApp number it links to.
-- The page is read on the server with the service role and shows only public
-- fields (name, description, services, hours, logo); owners set these two.
alter table public.business_knowledge
  add column if not exists public_slug text unique check (public_slug is null or public_slug ~ '^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$'),
  add column if not exists public_whatsapp text check (public_whatsapp is null or public_whatsapp ~ '^[1-9][0-9]{6,14}$');

grant update (public_slug, public_whatsapp) on public.business_knowledge to authenticated;
