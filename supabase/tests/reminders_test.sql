-- =============================================================================
-- Reminders test (run AFTER 20261014100000_reminders.sql). Rolled back: nothing is saved.
--   Success: "Success. No rows returned"   Failure: an error starting with "FAIL:".
-- =============================================================================

begin;

insert into auth.users (id, email, aud, role)
values ('a5000000-0000-4000-8000-00000000000a', 'rem-a@example.invalid', 'authenticated', 'authenticated');

set local role authenticated;
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"a5000000-0000-4000-8000-00000000000a","role":"authenticated"}', true); end $$;

do $$
declare n integer;
begin
  if (select reminders_enabled::text || reminder_template || reminder_template_lang from public.business_knowledge) <> 'trueappointment_reminderen'
    then raise exception 'FAIL: wrong reminder defaults'; end if;
  update public.business_knowledge set reminders_enabled = false, reminder_template = 'my_reminder', reminder_template_lang = 'so';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: owner could not change reminder settings'; end if;
  insert into public.bookings (business_id, customer_name, phone_number, service_selected, date_time, status, source)
    values (public.my_business_id(), 'X', '+1000', 'Y', now() + interval '1 day', 'confirmed', 'manual');
end $$;

do $$
begin
  update public.business_knowledge set reminder_template = 'Bad Name!';
  raise exception 'FAIL: invalid template name accepted';
exception when check_violation then null;
end $$;

do $$
begin
  update public.bookings set reminder_status = 'sent';
  raise exception 'FAIL: owner set reminder_status';
exception when insufficient_privilege then null;
end $$;

rollback;
