"use server";

import { configStatus } from "@/lib/env";
import { fmt } from "@/lib/i18n/config";
import { requestLocale, requestMessages } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/notify";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

export type NewsletterState = { ok?: boolean; error?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Website "get updates" form. Double opt-in: stores the address unconfirmed and
 * emails a confirmation link. The answer is the same whether or not the address
 * is already on the list, and one address gets at most one email a day, so the
 * form can't be used to probe the list or to flood someone's inbox.
 */
export async function subscribe(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const m = await requestMessages();
  const t = m.newsletter;
  // Bots fill every field; people never see this one.
  if (String(formData.get("website") ?? "")) return { ok: true };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return { error: t.invalid };
  if (!configStatus().serviceRole) return { error: t.failed };

  const locale = await requestLocale();
  const db = createAdminClient();
  const { data: existing } = await db.from("subscribers").select("token, confirmed_at, confirm_sent_at").eq("email", email).maybeSingle();
  if (existing?.confirmed_at) return { ok: true };
  if (existing?.confirm_sent_at && Date.now() - new Date(existing.confirm_sent_at).getTime() < RESEND_AFTER_MS) return { ok: true };

  const now = new Date().toISOString();
  const { data: row, error } = existing
    ? await db.from("subscribers").update({ confirm_sent_at: now, locale }).eq("email", email).select("token").single()
    : await db.from("subscribers").insert({ email, locale, confirm_sent_at: now }).select("token").single();
  if (error || !row) {
    logger.error("newsletter_subscribe_failed", { code: error?.code });
    return { error: t.failed };
  }

  const link = `${siteUrl()}/api/newsletter/confirm?t=${row.token}`;
  const sent = await sendEmail({ to: email, subject: t.emailSubject, text: fmt(t.emailBody, { link }) });
  if (!sent) return { error: t.failed };
  logger.info("newsletter_confirm_sent");
  return { ok: true };
}
