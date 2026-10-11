-- =============================================================================
-- Worldwide settings test (run AFTER 20261011100000_global.sql).
--
-- Everything runs inside a transaction that is ROLLED BACK: nothing is saved.
--   Success: "Success. No rows returned"
--   Failure: an error starting with "FAIL:".
-- =============================================================================

begin;

-- Sign-up keeps a real browser time zone and ignores a made-up one.
insert into auth.users (id, email, aud, role, raw_user_meta_data)
values
  ('a2000000-0000-4000-8000-00000000000a', 'global-a@example.invalid', 'authenticated', 'authenticated', '{"timezone":"America/New_York"}'),
  ('b2000000-0000-4000-8000-00000000000b', 'global-b@example.invalid', 'authenticated', 'authenticated', '{"timezone":"Mars/Olympus"}');

do $$
begin
  if (select timezone from public.business_knowledge where owner_id = 'a2000000-0000-4000-8000-00000000000a') <> 'America/New_York'
    then raise exception 'FAIL: sign-up time zone not used'; end if;
  if (select timezone from public.business_knowledge where owner_id = 'b2000000-0000-4000-8000-00000000000b') <> 'UTC'
    then raise exception 'FAIL: invalid sign-up time zone not replaced by UTC'; end if;
  if (select currency || ':' || time_format from public.business_knowledge where owner_id = 'a2000000-0000-4000-8000-00000000000a') <> 'USD:24h'
    then raise exception 'FAIL: wrong currency/time format defaults'; end if;
end $$;

-- ---------------------------------------------------------------- as owner A
set local role authenticated;
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"a2000000-0000-4000-8000-00000000000a","role":"authenticated"}', true); end $$;

do $$
declare n integer;
begin
  update public.business_knowledge set currency = 'EUR', time_format = '12h'
  where owner_id = 'a2000000-0000-4000-8000-00000000000a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: owner could not change currency/time format'; end if;
end $$;

do $$
begin
  update public.business_knowledge set currency = 'euro';
  raise exception 'FAIL: invalid currency accepted';
exception when check_violation then null;
end $$;

do $$
begin
  update public.business_knowledge set time_format = 'am/pm';
  raise exception 'FAIL: invalid time format accepted';
exception when check_violation then null;
end $$;

-- Customer language is set by the server only.
do $$
begin
  update public.conversations set language = 'fr';
  raise exception 'FAIL: owner changed a conversation language';
exception when insufficient_privilege then null;
end $$;

rollback;
