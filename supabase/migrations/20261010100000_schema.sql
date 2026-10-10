-- =============================================================================
-- WhatsApp AI Agent: database schema (Step 1).
--
-- Run in Supabase -> SQL Editor (safe to run more than once).
--
-- Multi-tenant: every signed-up owner gets one business (business_knowledge
-- row). All other data hangs off that business and Row Level Security lets
-- an owner see only their own business's data.
--
-- Who writes what:
--   * Owners (signed in, RLS applies): edit their knowledge base, manage
--     bookings, close conversations.
--   * The server (service-role key, server-only): writes conversations and
--     messages from the WhatsApp webhook and the chat tester, and creates
--     bookings captured by the AI. The service-role key never reaches the
--     browser.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- profiles: one row per user
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- business_knowledge: the tenant. Everything the AI knows about the business.
--
--   services      [{ "name": "Haircut", "price": "$15", "duration_minutes": 30, "description": "" }]
--   working_hours { "mon": { "open": "09:00", "close": "17:00" }, "sun": null, ... }  (null = closed)
--   faqs          [{ "question": "...", "answer": "..." }]
-- -----------------------------------------------------------------------------
create table if not exists public.business_knowledge (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  business_name text not null default '' check (char_length(business_name) <= 120),
  description text not null default '' check (char_length(description) <= 2000),
  services jsonb not null default '[]'::jsonb
    check (jsonb_typeof(services) = 'array' and octet_length(services::text) <= 20000),
  working_hours jsonb not null default '{}'::jsonb
    check (jsonb_typeof(working_hours) = 'object' and octet_length(working_hours::text) <= 2000),
  faqs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(faqs) = 'array' and octet_length(faqs::text) <= 30000),
  booking_policy text not null default '' check (char_length(booking_policy) <= 3000),
  timezone text not null default 'UTC' check (char_length(timezone) <= 64),
  -- Meta WhatsApp Cloud API "phone number ID" that routes incoming messages here.
  whatsapp_phone_number_id text unique check (whatsapp_phone_number_id ~ '^[0-9]{5,30}$'),
  ai_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.business_knowledge is 'One business per owner (the tenant). Read by the AI to build its system prompt.';

drop trigger if exists business_knowledge_set_updated_at on public.business_knowledge;
create trigger business_knowledge_set_updated_at before update on public.business_knowledge
  for each row execute function public.set_updated_at();

-- Reject unknown time zones (a CHECK can't look them up).
create or replace function public.validate_business_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists business_knowledge_validate_timezone on public.business_knowledge;
create trigger business_knowledge_validate_timezone
  before insert or update of timezone on public.business_knowledge
  for each row execute function public.validate_business_timezone();

-- The signed-in owner's business id (security definer: avoids RLS recursion).
create or replace function public.my_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.id from public.business_knowledge b where b.owner_id = (select auth.uid());
$$;

revoke execute on function public.my_business_id() from public, anon;
grant execute on function public.my_business_id() to authenticated;


-- -----------------------------------------------------------------------------
-- conversations: one per customer phone per channel
-- -----------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_knowledge (id) on delete cascade,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'test')),
  customer_phone text not null check (char_length(customer_phone) between 3 and 32),
  customer_name text check (char_length(customer_name) <= 120),
  status text not null default 'open' check (status in ('open', 'closed')),
  last_intent text check (last_intent in ('booking', 'services', 'pricing', 'hours', 'faq', 'greeting', 'other')),
  -- A lead: the customer asked about prices or booking.
  is_lead boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (business_id, channel, customer_phone)
);

create index if not exists conversations_business_recent_idx
  on public.conversations (business_id, last_message_at desc);


-- -----------------------------------------------------------------------------
-- messages: chat history (append-only)
-- -----------------------------------------------------------------------------
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  business_id uuid not null references public.business_knowledge (id) on delete cascade,
  role text not null check (role in ('customer', 'assistant')),
  content text not null check (char_length(content) between 1 and 10000),
  intent text check (intent in ('booking', 'services', 'pricing', 'hours', 'faq', 'greeting', 'other')),
  -- Provider message id (e.g. WhatsApp "wamid…"): webhook retries are ignored.
  external_id text check (char_length(external_id) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, id);
create unique index if not exists messages_external_id_key
  on public.messages (business_id, external_id) where external_id is not null;

-- Each message updates its conversation: recency, latest intent, lead flag.
create or replace function public.on_message_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations c
  set last_message_at = new.created_at,
      last_intent = coalesce(new.intent, c.last_intent),
      is_lead = c.is_lead or coalesce(new.intent in ('booking', 'pricing'), false)
  where c.id = new.conversation_id;
  return new;
end;
$$;

revoke execute on function public.on_message_inserted() from public, anon, authenticated;

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_inserted();


-- -----------------------------------------------------------------------------
-- bookings
-- -----------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_knowledge (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  phone_number text not null check (char_length(phone_number) between 3 and 32),
  service_selected text not null check (char_length(service_selected) between 1 and 200),
  date_time timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text not null default '' check (char_length(notes) <= 1000),
  source text not null default 'ai' check (source in ('ai', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_business_date_idx on public.bookings (business_id, date_time);
create index if not exists bookings_business_status_idx on public.bookings (business_id, status);
create index if not exists bookings_conversation_idx on public.bookings (conversation_id) where conversation_id is not null;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- New users: a profile and an empty business (knowledge base) to fill in.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 100), ''))
  on conflict (id) do nothing;
  insert into public.business_knowledge (owner_id) values (new.id)
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users that existed before this migration.
insert into public.profiles (id, email) select u.id, u.email from auth.users u on conflict (id) do nothing;
insert into public.business_knowledge (owner_id) select u.id from auth.users u on conflict (owner_id) do nothing;


-- -----------------------------------------------------------------------------
-- Row Level Security: owners see and change only their own business's data.
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.business_knowledge enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "Own profile: read" on public.profiles;
create policy "Own profile: read" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
drop policy if exists "Own profile: update" on public.profiles;
create policy "Own profile: update" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Own business: read" on public.business_knowledge;
create policy "Own business: read" on public.business_knowledge for select to authenticated
  using ((select auth.uid()) = owner_id);
drop policy if exists "Own business: update" on public.business_knowledge;
create policy "Own business: update" on public.business_knowledge for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

drop policy if exists "Own conversations: read" on public.conversations;
create policy "Own conversations: read" on public.conversations for select to authenticated
  using (business_id = (select public.my_business_id()));
drop policy if exists "Own conversations: update" on public.conversations;
create policy "Own conversations: update" on public.conversations for update to authenticated
  using (business_id = (select public.my_business_id())) with check (business_id = (select public.my_business_id()));
drop policy if exists "Own conversations: delete" on public.conversations;
create policy "Own conversations: delete" on public.conversations for delete to authenticated
  using (business_id = (select public.my_business_id()));

drop policy if exists "Own messages: read" on public.messages;
create policy "Own messages: read" on public.messages for select to authenticated
  using (business_id = (select public.my_business_id()));

drop policy if exists "Own bookings: read" on public.bookings;
create policy "Own bookings: read" on public.bookings for select to authenticated
  using (business_id = (select public.my_business_id()));
drop policy if exists "Own bookings: add" on public.bookings;
create policy "Own bookings: add" on public.bookings for insert to authenticated
  with check (business_id = (select public.my_business_id()) and source = 'manual');
drop policy if exists "Own bookings: update" on public.bookings;
create policy "Own bookings: update" on public.bookings for update to authenticated
  using (business_id = (select public.my_business_id())) with check (business_id = (select public.my_business_id()));
drop policy if exists "Own bookings: delete" on public.bookings;
create policy "Own bookings: delete" on public.bookings for delete to authenticated
  using (business_id = (select public.my_business_id()));

-- Least privilege: column-level grants say exactly what owners may change.
revoke all on public.profiles, public.business_knowledge, public.conversations, public.messages, public.bookings
  from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

grant select on public.business_knowledge to authenticated;
grant update (business_name, description, services, working_hours, faqs, booking_policy, timezone,
              whatsapp_phone_number_id, ai_enabled)
  on public.business_knowledge to authenticated;

grant select, delete on public.conversations to authenticated;
grant update (status, customer_name, is_lead) on public.conversations to authenticated;

grant select on public.messages to authenticated;

grant select, delete on public.bookings to authenticated;
grant insert (business_id, customer_name, phone_number, service_selected, date_time, status, notes, source)
  on public.bookings to authenticated;
grant update (customer_name, phone_number, service_selected, date_time, status, notes)
  on public.bookings to authenticated;


-- -----------------------------------------------------------------------------
-- Realtime: the dashboard updates live (RLS still applies to what's sent).
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['conversations', 'messages', 'bookings'] loop
      if not exists (
        select 1 from pg_catalog.pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
