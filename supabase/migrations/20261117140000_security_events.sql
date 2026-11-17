-- Security log for rate limits and operator alerts: failed logins, signups,
-- password resets, server errors and admin actions. Written and read only by
-- the server (service role); `key` is a salted hash of the IP, never the IP.
create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  kind text not null check (char_length(kind) between 1 and 40),
  key text not null default '' check (char_length(key) <= 128),
  detail text check (detail is null or char_length(detail) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists security_events_kind_key_idx on public.security_events (kind, key, created_at desc);
create index if not exists security_events_created_idx on public.security_events (created_at);

alter table public.security_events enable row level security;
revoke all on public.security_events from anon, authenticated;
