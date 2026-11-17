-- Part payments on a debt ("Lacag qayb ah"): each payment the customer makes.
-- The remaining balance is debts.amount minus the sum of its payments; the app
-- marks the debt paid once nothing is left. RLS by business, like debts.
create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts (id) on delete cascade,
  business_id uuid not null references public.business_knowledge (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0 and amount < 10000000),
  created_at timestamptz not null default now()
);

create index if not exists debt_payments_debt_idx on public.debt_payments (debt_id, created_at);

alter table public.debt_payments enable row level security;

drop policy if exists "Own debt payments: read" on public.debt_payments;
create policy "Own debt payments: read" on public.debt_payments for select to authenticated
  using (business_id = (select public.my_business_id()));
drop policy if exists "Own debt payments: add" on public.debt_payments;
create policy "Own debt payments: add" on public.debt_payments for insert to authenticated
  with check (
    business_id = (select public.my_business_id())
    and exists (select 1 from public.debts d where d.id = debt_id and d.business_id = (select public.my_business_id()))
  );
drop policy if exists "Own debt payments: delete" on public.debt_payments;
create policy "Own debt payments: delete" on public.debt_payments for delete to authenticated
  using (business_id = (select public.my_business_id()));

revoke all on public.debt_payments from anon, authenticated;
grant select, delete on public.debt_payments to authenticated;
grant insert (debt_id, business_id, amount) on public.debt_payments to authenticated;
