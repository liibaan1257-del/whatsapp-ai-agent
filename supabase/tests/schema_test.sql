-- =============================================================================
-- Schema test: tenant isolation, write rules, triggers.
--
-- Run in Supabase -> SQL Editor AFTER the migration. Everything runs inside a
-- transaction that is ROLLED BACK at the end: nothing is saved.
--
--   Success: "Success. No rows returned"
--   Failure: an error starting with "FAIL:".
-- =============================================================================

begin;

-- Two owners (A, B). Sign-up creates a profile and an empty business each.
insert into auth.users (id, email, aud, role)
values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'owner-a@example.invalid', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'owner-b@example.invalid', 'authenticated', 'authenticated');

do $$
begin
  if (select count(*) from public.business_knowledge
      where owner_id in ('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b')) <> 2
    then raise exception 'FAIL: sign-up did not create a business per owner'; end if;
  if (select count(*) from public.profiles
      where id in ('aaaaaaaa-0000-4000-8000-00000000000a', 'bbbbbbbb-0000-4000-8000-00000000000b')) <> 2
    then raise exception 'FAIL: sign-up did not create profiles'; end if;
end $$;

-- Server-side data (as the service role would write it): one conversation per owner.
do $$
declare a uuid; b uuid; ca uuid; cb uuid;
begin
  select id into a from public.business_knowledge where owner_id = 'aaaaaaaa-0000-4000-8000-00000000000a';
  select id into b from public.business_knowledge where owner_id = 'bbbbbbbb-0000-4000-8000-00000000000b';
  insert into public.conversations (business_id, customer_phone) values (a, '+252610000001') returning id into ca;
  insert into public.conversations (business_id, customer_phone) values (b, '+252610000002') returning id into cb;
  insert into public.messages (conversation_id, business_id, role, content, external_id)
    values (ca, a, 'customer', 'Hi, how much is a haircut?', 'wamid.1');
  insert into public.messages (conversation_id, business_id, role, content, intent)
    values (ca, a, 'assistant', 'A haircut is $15.', 'pricing');
  insert into public.messages (conversation_id, business_id, role, content) values (cb, b, 'customer', 'Hello');
  insert into public.bookings (business_id, conversation_id, customer_name, phone_number, service_selected, date_time)
    values (a, ca, 'Amina', '+252610000001', 'Haircut', now() + interval '1 day');
  insert into public.bookings (business_id, conversation_id, customer_name, phone_number, service_selected, date_time)
    values (b, cb, 'Omar', '+252610000002', 'Massage', now() + interval '1 day');

  -- Trigger: latest intent and lead flag on the conversation.
  if (select last_intent || ':' || is_lead from public.conversations where id = ca) <> 'pricing:true'
    then raise exception 'FAIL: message trigger did not update the conversation'; end if;

  -- Webhook retries: the same provider message id is stored once.
  begin
    insert into public.messages (conversation_id, business_id, role, content, external_id)
      values (ca, a, 'customer', 'Hi, how much is a haircut?', 'wamid.1');
    raise exception 'FAIL: duplicate external_id accepted';
  exception when unique_violation then null;
  end;
end $$;

do $$
begin
  update public.business_knowledge set timezone = 'Mars/Olympus' where owner_id = 'aaaaaaaa-0000-4000-8000-00000000000a';
  raise exception 'FAIL: invalid time zone accepted';
exception when invalid_parameter_value then null;
end $$;


-- B's business id, for the cross-tenant write attempt below.
do $$ begin perform set_config('test.b_business',
  (select id::text from public.business_knowledge where owner_id = 'bbbbbbbb-0000-4000-8000-00000000000b'), true); end $$;

-- ---------------------------------------------------------------- as owner A
set local role authenticated;
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-4000-8000-00000000000a","role":"authenticated"}', true); end $$;

do $$
declare n integer;
begin
  if (select count(*) from public.business_knowledge) <> 1 then raise exception 'FAIL: A sees other businesses'; end if;
  if (select count(*) from public.conversations) <> 1 then raise exception 'FAIL: A sees other conversations'; end if;
  if (select count(*) from public.messages) <> 2 then raise exception 'FAIL: A sees other messages'; end if;
  if (select count(*) from public.bookings) <> 1 then raise exception 'FAIL: A sees other bookings'; end if;

  -- Edit own knowledge base.
  update public.business_knowledge
  set business_name = 'Amina Salon', services = '[{"name":"Haircut","price":"$15","duration_minutes":30}]',
      working_hours = '{"mon":{"open":"09:00","close":"17:00"},"fri":null}', timezone = 'Africa/Mogadishu'
  where owner_id = 'aaaaaaaa-0000-4000-8000-00000000000a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: A could not update own knowledge'; end if;

  -- Another owner's rows are invisible, so updates/deletes touch nothing.
  update public.business_knowledge set business_name = 'hacked' where owner_id = 'bbbbbbbb-0000-4000-8000-00000000000b';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: A updated B''s business'; end if;
  update public.bookings set status = 'cancelled' where customer_name = 'Omar';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: A updated B''s booking'; end if;
  delete from public.conversations where customer_phone = '+252610000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: A deleted B''s conversation'; end if;

  -- Own booking: confirm it, add a manual one.
  update public.bookings set status = 'confirmed' where customer_name = 'Amina';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: A could not confirm own booking'; end if;
  insert into public.bookings (business_id, customer_name, phone_number, service_selected, date_time, source)
    values (public.my_business_id(), 'Walk-in', '+252610000009', 'Haircut', now() + interval '2 days', 'manual');
end $$;

-- Forbidden writes.
do $$
begin
  insert into public.bookings (business_id, customer_name, phone_number, service_selected, date_time, source)
    values (current_setting('test.b_business')::uuid, 'X', '+1000', 'Y', now(), 'manual');
  raise exception 'FAIL: A added a booking to B''s business';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  update public.business_knowledge set owner_id = 'bbbbbbbb-0000-4000-8000-00000000000b';
  raise exception 'FAIL: owner_id changed';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  insert into public.messages (conversation_id, business_id, role, content)
    select id, business_id, 'assistant', 'forged' from public.conversations limit 1;
  raise exception 'FAIL: owner forged a message';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  insert into public.conversations (business_id, customer_phone) values (public.my_business_id(), '+1999');
  raise exception 'FAIL: owner created a conversation directly';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  insert into public.bookings (business_id, customer_name, phone_number, service_selected, date_time, source)
    values (public.my_business_id(), 'X', '+1000', 'Y', now(), 'ai');
  raise exception 'FAIL: owner inserted a booking pretending to be the AI';
exception when insufficient_privilege then null;
end $$;

-- ---------------------------------------------------------------- anonymous
reset role;
set local role anon;
do $$
begin
  perform 1 from public.bookings;
  raise exception 'FAIL: anon read bookings';
exception when insufficient_privilege then null;
end $$;

rollback;
