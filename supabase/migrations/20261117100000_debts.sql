-- Debt book ("Buugga Deynta"): what customers owe a shop. Owners add, mark paid
-- and delete their own rows (RLS by business, like bookings). Reminders are sent
-- from the owner's own WhatsApp through a wa.me link, so nothing here is sent by us.
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_knowledge (id) on delete cascade,
  customer_name text not null check (char_length(customer_name) between 1 and 100),
  phone_number text check (phone_number is null or phone_number ~ '^[1-9][0-9]{6,14}$'),
  amount numeric(12, 2) not null check (amount > 0 and amount < 10000000),
  note text check (note is null or char_length(note) <= 300),
  due_date date,
  status text not null default 'open' check (status in ('open', 'paid')),
  paid_at timestamptz,
  reminded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists debts_business_status_idx on public.debts (business_id, status, created_at desc);

alter table public.debts enable row level security;

drop policy if exists "Own debts: read" on public.debts;
create policy "Own debts: read" on public.debts for select to authenticated
  using (business_id = (select public.my_business_id()));
drop policy if exists "Own debts: add" on public.debts;
create policy "Own debts: add" on public.debts for insert to authenticated
  with check (business_id = (select public.my_business_id()));
drop policy if exists "Own debts: update" on public.debts;
create policy "Own debts: update" on public.debts for update to authenticated
  using (business_id = (select public.my_business_id())) with check (business_id = (select public.my_business_id()));
drop policy if exists "Own debts: delete" on public.debts;
create policy "Own debts: delete" on public.debts for delete to authenticated
  using (business_id = (select public.my_business_id()));

revoke all on public.debts from anon, authenticated;
grant select, delete on public.debts to authenticated;
grant insert (business_id, customer_name, phone_number, amount, note, due_date) on public.debts to authenticated;
grant update (status, paid_at, reminded_at) on public.debts to authenticated;
