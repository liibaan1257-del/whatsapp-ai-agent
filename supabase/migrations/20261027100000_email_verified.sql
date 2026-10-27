-- Owners get into the dashboard right after sign-up; their email is checked
-- separately. email_verified_at is set (server-side, service role) when they
-- open the link we email them, and is needed before connecting WhatsApp.
alter table public.profiles
  add column if not exists email_verified_at timestamptz,
  add column if not exists verify_email_sent_at timestamptz;

-- Owners who already confirmed through the old flow count as verified.
update public.profiles p
set email_verified_at = u.email_confirmed_at
from auth.users u
where u.id = p.id and u.email_confirmed_at is not null and p.email_verified_at is null;

-- Readable by the owner (RLS: own row only); never writable from the browser.
grant select (email_verified_at) on public.profiles to authenticated;
