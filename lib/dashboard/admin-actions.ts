"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { sendConfirmationEmail } from "@/lib/auth/confirm-email";
import { getOwner } from "@/lib/auth/session";
import { isPlan } from "@/lib/billing";
import { configStatus, serverEnv } from "@/lib/env";
import { fmt } from "@/lib/i18n/config";
import { requestMessages } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { sendEmail, sendWelcome } from "@/lib/notify";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OPS = ["month", "year", "pause", "plan"] as const;
type Op = (typeof OPS)[number];

export type AdminState = { ok?: boolean; error?: string; notice?: string };

/**
 * Operator only: extend, pause or change the plan of any business after a
 * manual payment. The admin flag is read from the database for the signed-in
 * user (never from the form); the write uses the service role.
 */
export async function updateBilling(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const m = await requestMessages();
  const owner = await getOwner();
  if (!owner?.isAdmin) return { error: m.admin.failed };
  if (!configStatus().serviceRole) return { error: m.admin.notConfigured };

  const id = String(formData.get("business_id") ?? "");
  const op = String(formData.get("op") ?? "") as Op;
  const plan = String(formData.get("plan") ?? "");
  if (!UUID.test(id) || !OPS.includes(op) || (op === "plan" && !isPlan(plan))) return { error: m.admin.failed };

  const db = createAdminClient();
  const { data: business } = await db.from("business_knowledge").select("access_until").eq("id", id).maybeSingle();
  if (!business) return { error: m.admin.failed };

  const now = new Date();
  // Extend from today, or from the current end date if it's still in the future.
  const base = new Date(Math.max(now.getTime(), new Date(business.access_until).getTime()));
  const update: { access_until?: string; plan?: string } = {};
  if (op === "month") update.access_until = new Date(base.setUTCMonth(base.getUTCMonth() + 1)).toISOString();
  else if (op === "year") update.access_until = new Date(base.setUTCFullYear(base.getUTCFullYear() + 1)).toISOString();
  else if (op === "pause") update.access_until = now.toISOString();
  else update.plan = plan;

  const { error } = await db.from("business_knowledge").update(update).eq("id", id);
  if (error) {
    logger.error("admin_billing_failed", { businessId: id, op, code: error.code });
    return { error: m.admin.failed };
  }
  logger.info("admin_billing_updated", { by: owner.id, businessId: id, op, ...update });
  if (op === "month" || op === "year") await rewardReferrer(db, id);
  refresh();
  return { ok: true };
}

/**
 * Operator only: delete a business owner's account and all its data (test or
 * junk sign-ups). Admin accounts can't be deleted here.
 */
export async function deleteBusinessAccount(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const m = await requestMessages();
  const owner = await getOwner();
  if (!owner?.isAdmin) return { error: m.admin.failed };
  if (!configStatus().serviceRole) return { error: m.admin.notConfigured };

  const id = String(formData.get("business_id") ?? "");
  if (!UUID.test(id)) return { error: m.admin.failed };

  const db = createAdminClient();
  const { data: business } = await db.from("business_knowledge").select("owner_id").eq("id", id).maybeSingle();
  if (!business) return { error: m.admin.failed };
  const { data: profile } = await db.from("profiles").select("is_platform_admin").eq("id", business.owner_id).maybeSingle();
  if (business.owner_id === owner.id || profile?.is_platform_admin) return { error: m.admin.cannotDeleteAdmin };

  // Deleting the login removes the profile, business and everything under it (foreign keys cascade).
  const { error } = await db.auth.admin.deleteUser(business.owner_id);
  if (error) {
    logger.error("admin_delete_failed", { businessId: id, status: error.status });
    return { error: m.admin.failed };
  }
  logger.info("admin_account_deleted", { by: owner.id, businessId: id });
  refresh();
  return { ok: true };
}

/**
 * Operator only: (re)send the welcome email to a business owner, in Somali and
 * English, plus a confirmation link if they never confirmed their email.
 */
export async function sendWelcomeEmail(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const m = await requestMessages();
  const owner = await getOwner();
  if (!owner?.isAdmin) return { error: m.admin.failed };
  if (!configStatus().serviceRole) return { error: m.admin.notConfigured };

  const id = String(formData.get("business_id") ?? "");
  if (!UUID.test(id)) return { error: m.admin.failed };
  const db = createAdminClient();
  const { data: business } = await db.from("business_knowledge").select("owner_id").eq("id", id).maybeSingle();
  if (!business) return { error: m.admin.failed };
  const { data: profile } = await db.from("profiles").select("email, full_name").eq("id", business.owner_id).maybeSingle();
  if (!profile?.email) return { error: m.admin.failed };

  const sent = await sendWelcome(profile.email, profile.full_name ?? "", "both");
  // An owner who never confirmed their email also gets a fresh confirmation link.
  const confirm = await sendConfirmationEmail(profile.email, siteUrl(), "both");
  logger.info("admin_welcome_sent", { by: owner.id, businessId: id, sent, confirm });
  return sent ? { ok: true, notice: m.admin.welcomeSent } : { error: m.admin.emailFailed };
}

const WABA_ID = /^\d{5,25}$/;

/**
 * Operator only: subscribe this app to a WhatsApp Business Account so Meta
 * delivers its incoming messages to the webhook (POST /{waba}/subscribed_apps).
 * Uses WHATSAPP_ACCESS_TOKEN on the server; the token never reaches the browser.
 */
export async function connectWhatsApp(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const m = await requestMessages();
  const owner = await getOwner();
  if (!owner?.isAdmin) return { error: m.admin.failed };
  const token = serverEnv.whatsappAccessToken();
  if (!token) return { error: m.admin.waNoToken };

  const typed = String(formData.get("waba_id") ?? "").trim();
  if (typed && !WABA_ID.test(typed)) return { error: m.admin.waBadId };

  const graph = `${(process.env.WHATSAPP_API_BASE ?? "https://graph.facebook.com").replace(/\/+$/, "")}/${serverEnv.whatsappGraphVersion()}`;
  const call = async (path: string, method: "GET" | "POST" = "GET") => {
    try {
      const res = await fetch(`${graph}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
      });
      const body = await res.json().catch(() => null);
      const error = body?.error ? [body.error.code, body.error.message].filter(Boolean).join(": ") : res.ok ? "" : `status ${res.status}`;
      return { ok: res.ok && !body?.error, body, error };
    } catch (error) {
      return { ok: false, body: null, error: error instanceof Error ? error.name : "network_error" };
    }
  };

  // No ID typed: read the WhatsApp Business Account IDs this token may manage.
  let wabas = typed ? [typed] : [];
  if (!typed) {
    const info = await call(`/debug_token?input_token=${encodeURIComponent(token)}`);
    const data = info.body?.data;
    const scopes: { scope?: string; target_ids?: string[] }[] = data?.granular_scopes ?? [];
    wabas = [...new Set(scopes.filter((g) => g.scope?.startsWith("whatsapp_business")).flatMap((g) => g.target_ids ?? []))].filter((id) =>
      WABA_ID.test(id),
    );
    const summary = info.ok
      ? `token app ${data?.app_id ?? "?"}, valid ${data?.is_valid}, expires ${data?.expires_at ? new Date(data.expires_at * 1000).toISOString() : "never"}, scopes ${(data?.scopes ?? []).join(" ")}, wabas ${wabas.join(" ") || "none"}`
      : `debug_token failed: ${info.error}`;
    await recordAdminEvent("token_info", summary);
    if (!wabas.length) return { error: fmt(m.admin.waFailed, { detail: summary.slice(0, 300) }) };
  }

  const done: string[] = [];
  const failed: string[] = [];
  for (const waba of wabas) {
    const r = await call(`/${waba}/subscribed_apps`, "POST");
    if (r.ok && r.body?.success) done.push(waba);
    else failed.push(`${waba}: ${r.error}`);
  }
  if (done.length) {
    logger.info("admin_whatsapp_subscribed", { by: owner.id, wabas: done });
    await recordAdminEvent("subscribed_apps", `waba ${done.join(" ")}`);
  }
  if (failed.length) {
    logger.error("admin_whatsapp_subscribe_failed", { failed });
    await recordAdminEvent("subscribe_failed", failed.join(" | "));
  }
  refresh();
  if (!done.length) return { error: fmt(m.admin.waFailed, { detail: failed.join(" | ").slice(0, 300) }) };
  return { ok: true, notice: `${m.admin.waConnected} (${done.join(", ")})` };
}

async function recordAdminEvent(outcome: string, detail: string) {
  try {
    await createAdminClient().from("webhook_events").insert({ outcome, detail: detail.slice(0, 500) });
  } catch {
    // Diagnostics only.
  }
}

/**
 * The first time a referred business pays, the business that invited it gets
 * one free month. The conditional update makes this happen at most once.
 */
async function rewardReferrer(db: ReturnType<typeof createAdminClient>, businessId: string) {
  const { data: referee } = await db
    .from("business_knowledge")
    .update({ referral_rewarded_at: new Date().toISOString() })
    .eq("id", businessId)
    .not("referred_by", "is", null)
    .is("referral_rewarded_at", null)
    .select("referred_by, business_name")
    .maybeSingle();
  if (!referee?.referred_by) return;
  const { data: referrer } = await db.from("business_knowledge").select("id, owner_id, access_until").eq("id", referee.referred_by).maybeSingle();
  if (!referrer) return;
  const base = new Date(Math.max(Date.now(), new Date(referrer.access_until).getTime()));
  base.setUTCMonth(base.getUTCMonth() + 1);
  const { error } = await db.from("business_knowledge").update({ access_until: base.toISOString() }).eq("id", referrer.id);
  if (error) {
    logger.error("referral_reward_failed", { referrerId: referrer.id, code: error.code });
    return;
  }
  logger.info("referral_rewarded", { referrerId: referrer.id, refereeId: businessId });
  const { data: profile } = await db.from("profiles").select("email, full_name").eq("id", referrer.owner_id).maybeSingle();
  if (profile?.email) {
    const name = referee.business_name || "A business you invited";
    const until = base.toISOString().slice(0, 10);
    after(() =>
      sendEmail({
        to: profile.email,
        subject: "You earned a free month 🎁 / Waxaad heshay bil bilaash ah",
        text: [
          `${name} just subscribed to ReplyBooker with your invite link. Thank you!`,
          `Your access now runs until ${until}.`,
          "",
          `${name} ayaa ku biiray ReplyBooker iyadoo isticmaalaysa link-gaaga. Mahadsanid!`,
          `Adeeggaagu hadda wuu socdaa ilaa ${until}.`,
          "",
          `${siteUrl()}/dashboard/settings`,
        ].join("\n"),
      }),
    );
  }
}
