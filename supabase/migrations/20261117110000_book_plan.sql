-- "book" plan: the debt book only ($5/month), no AI bot.
alter table public.business_knowledge drop constraint if exists business_knowledge_plan_check;
alter table public.business_knowledge
  add constraint business_knowledge_plan_check check (plan in ('trial', 'book', 'starter', 'pro'));
