-- First-party, privacy-friendly visit counts for the public pages (not the
-- dashboard). No IP address, user agent or cookie is stored: only the page,
-- where the visitor came from, their country (from the hosting edge) and a
-- coarse device type. A random per-tab session id lets us count visitors.
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text not null check (char_length(path) between 1 and 200),
  referrer_host text check (char_length(referrer_host) <= 100),
  utm_source text check (char_length(utm_source) <= 60),
  country text check (country ~ '^[A-Z]{2}$'),
  device text check (device in ('mobile', 'tablet', 'desktop')),
  session_id text check (session_id ~ '^[a-z0-9]{8,32}$')
);

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);

-- Written and read only by the server (service role); no client access.
alter table public.page_views enable row level security;
