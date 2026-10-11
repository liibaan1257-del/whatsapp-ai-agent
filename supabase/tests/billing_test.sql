-- =============================================================================
-- Billing test (run AFTER 20261013100000_billing.sql). Rolled back: nothing is saved.
--   Success: "Success. No rows returned"   Failure: an error starting with "FAIL:".
-- =============================================================================

begin;

insert into auth.users (id, email, aud, role)
values ('a4000000-0000-4000-8000-00000000000a', 'bill-a@example.invalid', 'authenticated', 'authenticated');

do $$
begin
  if (select plan from public.business_knowledge where owner_id = 'a4000000-0000-4000-8000-00000000000a') <> 'trial'
    then raise exception 'FAIL: new business is not on the trial'; end if;
  if (select access_until from public.business_knowledge where owner_id = 'a4000000-0000-4000-8000-00000000000a')
     not between now() + interval '13 days' and now() + interval '15 days'
    then raise exception 'FAIL: trial is not 14 days'; end if;
end $$;

set local role authenticated;
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"a4000000-0000-4000-8000-00000000000a","role":"authenticated"}', true); end $$;

do $$
begin
  if (select plan from public.business_knowledge) <> 'trial' then raise exception 'FAIL: owner cannot read own plan'; end if;
end $$;

do $$
begin
  update public.business_knowledge set access_until = now() + interval '10 years';
  raise exception 'FAIL: owner extended own access';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  update public.business_knowledge set plan = 'pro';
  raise exception 'FAIL: owner changed own plan';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  update public.profiles set is_platform_admin = true;
  raise exception 'FAIL: owner made themselves admin';
exception when insufficient_privilege then null;
end $$;

rollback;
