# WhatsApp AI Agent

AI customer support and booking agent for WhatsApp. Business owners describe
their business (services, prices, hours, FAQs, booking policy); the agent
answers customers on WhatsApp with Claude, detects what they want, and
captures bookings into the database.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui ·
Supabase (Postgres, Auth, Realtime, RLS) · Claude (Anthropic) · WhatsApp
Cloud API · Vercel.

## Setup

1. Create a Supabase project and run `supabase/migrations/*.sql` in order in
   the SQL Editor. Optional check: run `supabase/tests/schema_test.sql`
   (it rolls back) → "Success. No rows returned".
2. Copy `.env.example` to `.env.local` and fill it in (see the comments).
3. `npm install` then `npm run dev`.

## Commands

| Command | What |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |

## Security

- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `WHATSAPP_*`) are
  server-only and never sent to the browser.
- Every table has Row Level Security: an owner only ever sees their own
  business's data.
