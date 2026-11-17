-- Server-only tables (written and read with the service role). RLS with no
-- policies already blocks browser clients; also drop the table grants so the
-- anon/authenticated roles have no path to them at all.
revoke all on public.page_views from anon, authenticated;
revoke all on public.hubi_reports from anon, authenticated;
revoke all on public.hubi_results from anon, authenticated;
revoke all on public.hubi_usage from anon, authenticated;
revoke all on public.subscribers from anon, authenticated;
revoke all on public.webhook_events from anon, authenticated;
