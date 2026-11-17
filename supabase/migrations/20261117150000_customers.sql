-- Customer list ("Liiska Macaamiisha"): names and WhatsApp numbers an owner keeps
-- for debts and bulk WhatsApp messages (sent from their own phone via wa.me).
-- One row per number per business. RLS by business, like debts.
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_knowledge (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  phone_number text not null check (phone_number ~ '^[1-9][0-9]{6,14}$'),
  created_at timestamptz not null default now(),
  unique (business_id, phone_number)
);

alter table public.customers enable row level security;

drop policy if exists "Own customers: read" on public.customers;
create policy "Own customers: read" on public.customers for select to authenticated
  using (business_id = (select public.my_business_id()));
drop policy if exists "Own customers: add" on public.customers;
create policy "Own customers: add" on public.customers for insert to authenticated
  with check (business_id = (select public.my_business_id()));
drop policy if exists "Own customers: delete" on public.customers;
create policy "Own customers: delete" on public.customers for delete to authenticated
  using (business_id = (select public.my_business_id()));

revoke all on public.customers from anon, authenticated;
grant select, delete on public.customers to authenticated;
grant insert (business_id, name, phone_number) on public.customers to authenticated;
