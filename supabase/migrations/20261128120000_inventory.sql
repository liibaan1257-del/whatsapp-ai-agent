-- Inventory ("Stock"): how many of each item a business has left. The cashier
-- and confirmed AI orders deduct from it; the AI won't sell items at 0.
-- One row per item name (case-insensitive) per business. RLS by business.
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_knowledge (id) on delete cascade,
  item text not null check (char_length(item) between 1 and 120),
  quantity integer not null default 0 check (quantity between 0 and 1000000),
  low_at integer not null default 5 check (low_at between 0 and 1000000),
  updated_at timestamptz not null default now()
);
create unique index if not exists inventory_business_item_key on public.inventory (business_id, lower(item));

alter table public.inventory enable row level security;

drop policy if exists "Own inventory: read" on public.inventory;
create policy "Own inventory: read" on public.inventory for select to authenticated
  using (business_id = (select public.my_business_id()));
drop policy if exists "Own inventory: add" on public.inventory;
create policy "Own inventory: add" on public.inventory for insert to authenticated
  with check (business_id = (select public.my_business_id()));
drop policy if exists "Own inventory: update" on public.inventory;
create policy "Own inventory: update" on public.inventory for update to authenticated
  using (business_id = (select public.my_business_id()))
  with check (business_id = (select public.my_business_id()));
drop policy if exists "Own inventory: delete" on public.inventory;
create policy "Own inventory: delete" on public.inventory for delete to authenticated
  using (business_id = (select public.my_business_id()));

revoke all on public.inventory from anon, authenticated;
grant select, delete on public.inventory to authenticated;
grant insert (business_id, item, quantity, low_at) on public.inventory to authenticated;
grant update (quantity, low_at, updated_at) on public.inventory to authenticated;

-- Deduct sold quantities: p_items is [{"name": "...", "quantity": n}, ...].
-- Items without a stock row are ignored. Runs with the caller's rights, so RLS
-- limits an owner to their own business (the service role is used for AI orders).
create or replace function public.inventory_deduct(p_business uuid, p_items jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.inventory i
     set quantity = greatest(0, i.quantity - s.qty),
         updated_at = now()
    from (
      select lower(trim(e->>'name')) as name, sum(greatest(0, coalesce((e->>'quantity')::int, 0))) as qty
        from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) e
       group by 1
    ) s
   where i.business_id = p_business
     and lower(i.item) = s.name;
$$;
revoke all on function public.inventory_deduct(uuid, jsonb) from public, anon;
grant execute on function public.inventory_deduct(uuid, jsonb) to authenticated, service_role;
