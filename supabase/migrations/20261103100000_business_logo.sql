-- Business logo shown in the dashboard sidebar. Stored inline as a small image
-- data URL (the browser resizes it to at most 256 px), so no storage bucket or
-- extra image host is needed. Written only by the server (service role) for the
-- signed-in owner's own business; readable by the owner through RLS.
alter table public.business_knowledge
  add column if not exists logo text
    check (logo is null or (char_length(logo) <= 120000 and logo ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$'));
