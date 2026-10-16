import type { NextRequest } from "next/server";
import { getMessages } from "@/lib/i18n/dictionaries";
import { logger } from "@/lib/logger";
import { localeOr, smallPage, TOKEN } from "@/lib/newsletter/page";
import { createAdminClient } from "@/lib/supabase/admin";

/** GET /api/newsletter/confirm?t=<token>: the link from the confirmation email. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const db = createAdminClient();
  const { data } = TOKEN.test(token) ? await db.from("subscribers").select("id, locale, confirmed_at").eq("token", token).maybeSingle() : { data: null };
  const t = getMessages(localeOr(data?.locale)).newsletter;
  if (!data) return smallPage("en", t.linkInvalidTitle, t.linkInvalid, undefined, 404);
  if (!data.confirmed_at) {
    await db.from("subscribers").update({ confirmed_at: new Date().toISOString() }).eq("id", data.id);
    logger.info("newsletter_confirmed");
  }
  return smallPage(localeOr(data.locale), t.confirmedTitle, t.confirmed);
}
