-- How customers pay the owner, added to debt reminders ("Ku bixi EVC Plus: *712*…#").
-- Owners edit their own row (column-level grant, RLS as for the rest of the knowledge).
alter table public.business_knowledge
  add column if not exists pay_method text check (pay_method is null or pay_method in ('evc', 'zaad', 'edahab', 'sahal', 'mpesa', 'bank', 'other')),
  add column if not exists pay_number text check (pay_number is null or char_length(pay_number) between 3 and 60);

grant update (pay_method, pay_number) on public.business_knowledge to authenticated;
