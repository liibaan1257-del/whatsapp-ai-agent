import type { NextRequest } from "next/server";
import { getMessages } from "@/lib/i18n/dictionaries";
import { logger } from "@/lib/logger";
import { localeOr, smallPage, TOKEN } from "@/lib/newsletter/page";
import { createAdminClient } from "@/lib/supabase/admin";

async function find(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  if (!TOKEN.test(token)) return { token, row: null };
  const { data } = await createAdminClient().from("subscribers").select("id, locale").eq("token", token).maybeSingle();
  return { token, row: data };
}

/** GET shows a button (link scanners must not unsubscribe people); POST removes the address. */
export async function GET(request: NextRequest) {
  const { token, row } = await find(request);
  const t = getMessages(localeOr(row?.locale)).newsletter;
  if (!row) return smallPage("en", t.unsubscribedTitle, t.unsubscribed);
  return smallPage(localeOr(row.locale), t.unsubscribeTitle, t.unsubscribeBody, { action: `/api/newsletter/unsubscribe?t=${token}`, button: t.unsubscribeButton });
}

export async function POST(request: NextRequest) {
  const { row } = await find(request);
  if (row) {
    await createAdminClient().from("subscribers").delete().eq("id", row.id);
    logger.info("newsletter_unsubscribed");
  }
  const t = getMessages(localeOr(row?.locale)).newsletter;
  return smallPage(localeOr(row?.locale), t.unsubscribedTitle, t.unsubscribed);
}
