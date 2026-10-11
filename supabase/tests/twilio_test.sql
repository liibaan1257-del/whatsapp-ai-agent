-- =============================================================================
-- Twilio settings test (run AFTER 20261012100000_twilio.sql).
-- Rolled back at the end: nothing is saved.
--   Success: "Success. No rows returned"   Failure: an error starting with "FAIL:".
-- =============================================================================

begin;

insert into auth.users (id, email, aud, role)
values
  ('a3000000-0000-4000-8000-00000000000a', 'tw-a@example.invalid', 'authenticated', 'authenticated'),
  ('b3000000-0000-4000-8000-00000000000b', 'tw-b@example.invalid', 'authenticated', 'authenticated');

set local role authenticated;
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"a3000000-0000-4000-8000-00000000000a","role":"authenticated"}', true); end $$;

do $$
declare n integer;
begin
  update public.business_knowledge set twilio_whatsapp_number = '+14155238886'
  where owner_id = 'a3000000-0000-4000-8000-00000000000a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: owner could not set the Twilio number'; end if;
end $$;

do $$
begin
  update public.business_knowledge set twilio_whatsapp_number = '0612345';
  raise exception 'FAIL: number without + and country code accepted';
exception when check_violation then null;
end $$;

do $$
begin
  update public.conversations set provider = 'twilio';
  raise exception 'FAIL: owner changed a conversation provider';
exception when insufficient_privilege then null;
end $$;

-- Owner B can't take the same number.
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"b3000000-0000-4000-8000-00000000000b","role":"authenticated"}', true); end $$;
do $$
begin
  update public.business_knowledge set twilio_whatsapp_number = '+14155238886'
  where owner_id = 'b3000000-0000-4000-8000-00000000000b';
  raise exception 'FAIL: two businesses share one Twilio number';
exception when unique_violation then null;
end $$;

rollback;
