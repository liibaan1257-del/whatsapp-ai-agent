-- No free trial for new accounts: access starts when the first payment is
-- recorded (Admin → +1 month). Existing trials keep their end date.
alter table public.business_knowledge alter column access_until set default now();
