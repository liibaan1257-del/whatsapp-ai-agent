"use server";

import { getOwner } from "@/lib/auth/session";
import { configStatus } from "@/lib/env";
import { fmt } from "@/lib/i18n/config";
import { requestLocale, requestMessages } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { sendEmail, sendEmailBatch } from "@/lib/notify";
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

export type BroadcastState = { ok?: boolean; error?: string; notice?: string };

/**
 * Operator only: email a newsletter to every confirmed subscriber. Each email
 * carries its own unsubscribe link (in the text and as List-Unsubscribe).
 */
export async function sendNewsletter(_prev: BroadcastState, formData: FormData): Promise<BroadcastState> {
  const m = await requestMessages();
  const owner = await getOwner();
  if (!owner?.isAdmin) return { error: m.admin.failed };
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || subject.length > 150 || !body || body.length > 10_000) return { error: m.admin.broadcastInvalid };
  if (!configStatus().serviceRole) return { error: m.admin.notConfigured };

  const { data: subs, error } = await createAdminClient().from("subscribers").select("email, token").not("confirmed_at", "is", null).limit(5000);
  if (error) return { error: m.admin.failed };
  if (!subs?.length) return { error: m.admin.noSubscribers };

  const site = siteUrl();
  const sent = await sendEmailBatch(
    subs.map((s) => {
      const unsubscribe = `${site}/api/newsletter/unsubscribe?t=${s.token}`;
      return {
        to: s.email,
        subject,
        text: `${body}\n\n---\nReplyBooker · ${site}\nUnsubscribe / Ka bax: ${unsubscribe}`,
        headers: { "List-Unsubscribe": `<${unsubscribe}>` },
      };
    }),
  );
  logger.info("newsletter_sent", { by: owner.id, total: subs.length, sent });
  if (!sent) return { error: m.admin.emailFailed };
  return { ok: true, notice: fmt(m.admin.broadcastSent, { n: sent, total: subs.length }) };
}
