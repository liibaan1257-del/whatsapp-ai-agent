# WhatsApp AI Agent

AI customer support and booking agent for WhatsApp. Business owners describe
their business (services, prices, hours, FAQs, booking policy); the agent
answers customers on WhatsApp with Claude, detects what they want, and
captures bookings that the owner confirms from a dashboard.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui ·
Supabase (Postgres, Auth, Realtime, RLS) · Claude (`claude-opus-5-5`) ·
WhatsApp Cloud API (Meta) · Vercel.

## Features

| Where | What |
| --- | --- |
| `/signup`, `/login` | Email + password accounts. Each owner gets their own business (multi-tenant). |
| `/dashboard` | Setup checklist, active conversations, leads, upcoming/pending bookings, recent chats. Updates live. |
| `/dashboard/knowledge` | Business details, services & prices, opening hours, FAQs, booking policy, WhatsApp connection, preview of what the AI knows. |
| `/dashboard/chat-test` | Chat as a customer against the real engine (separate "test" channel). |
| `/dashboard/bookings` | Upcoming / pending / past bookings; confirm, cancel, complete (the customer gets a WhatsApp message); add bookings by hand. |
| `/dashboard/conversations/[id]` | Full chat history with intents. |
| `/api/whatsapp/webhook` | Meta webhook: verification (GET) and incoming messages (POST). |

### How a WhatsApp message is handled

1. Meta POSTs to `/api/whatsapp/webhook`. The `X-Hub-Signature-256` HMAC is
   checked on the raw body; the route answers 200 immediately and continues
   in `after()`.
2. The business is found by its WhatsApp **phone number ID**; repeat
   deliveries of the same message id are ignored.
3. Claude gets the knowledge base as its system prompt plus the recent chat,
   and returns structured output: `{ reply, intent, customer_name, booking }`.
4. A booking is saved only after the server re-checks it: the service exists,
   the time is in the future, inside opening hours (business time zone), and
   doesn't overlap another booking. Otherwise the customer is told why.
5. The reply is saved and sent through the Graph API. The dashboard updates
   live via Supabase Realtime.

## Worldwide use

- **Any language**: the agent answers in the customer's language and remembers
  it; booking confirmations/cancellations you send from the dashboard are
  translated into that language too.
- **Any currency**: pick one in the knowledge base (ISO 4217). Prices typed as
  plain numbers ("25") are shown as "€25.00"; anything else is shown as typed.
- **Dashboard in 6 languages**: English, Español, Français, Deutsch, العربية
  (right-to-left) and Soomaali. The first visit follows the browser's language;
  the picker in the sidebar / login page remembers the choice (cookie `lang`).
  Links like `/fr/dashboard` switch the language. Text lives in
  `lib/i18n/messages/*.ts`; TypeScript fails the build if a language misses a key.
- **Any time zone, 12h or 24h**: new businesses start in the owner's browser
  time zone; opening hours, bookings and messages use it.

## Setup

### 1. Supabase
1. Create a project. In **SQL Editor**, run the migrations in order:
   `supabase/migrations/20261010100000_schema.sql`, then
   `supabase/migrations/20261011100000_global.sql` (currency, 12h/24h time,
   customer language, sign-up time zone).
   Optional checks: `supabase/tests/schema_test.sql` and
   `supabase/tests/global_test.sql` → "Success. No rows returned".
2. **Authentication → URL Configuration**: set Site URL to your Vercel URL and
   add `https://<your-app>/auth/confirm` to Redirect URLs.

### 2. Environment variables (Vercel → Settings → Environment Variables)
See `.env.example`. Mark every secret as **Sensitive**:

| Variable | Secret? |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** (server-only) |
| `ANTHROPIC_API_KEY` | **secret** |
| `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN` | **secret** |

Redeploy after changing them.

### 3. WhatsApp (Meta for Developers)
1. Create an app with the **WhatsApp** product.
2. **WhatsApp → Configuration → Webhook**: Callback URL
   `https://<your-app>/api/whatsapp/webhook`, Verify token = your
   `WHATSAPP_VERIFY_TOKEN`. Subscribe to **messages**.
3. Copy the **Phone number ID** (WhatsApp → API Setup) into the dashboard's
   Knowledge base → WhatsApp connection.

## Development

```bash
npm install
cp .env.example .env.local   # fill in
npm run dev
```

| Command | What |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Unit tests (time zones, booking rules) |

## Security

- Secrets are server-only. The service-role key is used only by server code
  (`lib/supabase/admin.ts` imports `server-only`).
- Row Level Security on every table: an owner only sees their own business.
  Column-level grants limit what owners can change; messages and AI bookings
  are written only by the server.
- Webhook requests must carry a valid Meta signature; the chat tester and
  dashboard actions take the business from the session, never from the
  request.
- Security headers (CSP, frame denial, HSTS…) in `lib/security/headers.ts`.
- MVP limits: one appointment at a time per business (no staff calendars);
  text messages only (media gets a polite reply).
