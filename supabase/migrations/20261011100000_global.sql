-- =============================================================================
-- WhatsApp AI Agent: worldwide use (run AFTER 20261010100000_schema.sql).
-- Safe to run more than once.
--
--   * business_knowledge.currency     ISO 4217 code used for prices (USD, EUR, GBP, …)
--   * business_knowledge.time_format  how times are shown: '24h' (14:00) or '12h' (2:00 PM)
--   * conversations.language          the customer's language, detected by the AI,
--                                     used for automatic messages (booking confirmations)
--   * New sign-ups get their browser's time zone instead of UTC.
-- =============================================================================

alter table public.business_knowledge
  add column if not exists currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  add column if not exists time_format text not null default '24h' check (time_format in ('12h', '24h'));

alter table public.conversations
  add column if not exists language text check (char_length(language) between 2 and 35);

-- Owners may edit the new settings (column-level grant, like the others).
grant update (currency, time_format) on public.business_knowledge to authenticated;

-- Sign-up: use the time zone the browser reported, when it's a real one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz text := nullif(trim(new.raw_user_meta_data ->> 'timezone'), '');
begin
  if v_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    v_tz := 'UTC';
  end if;

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 100), ''))
  on conflict (id) do nothing;

  insert into public.business_knowledge (owner_id, timezone) values (new.id, v_tz)
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
