"use server";

import { refresh } from "next/cache";
import { getOwner } from "@/lib/auth/session";
import { isPlan } from "@/lib/billing";
import { configStatus } from "@/lib/env";
import { requestMessages } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { sendWelcome } from "@/lib/notify";
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

/** Operator only: (re)send the welcome email to a business owner, in Somali and English. */
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
  logger.info("admin_welcome_sent", { by: owner.id, businessId: id, sent });
  return sent ? { ok: true, notice: m.admin.welcomeSent } : { error: m.admin.emailFailed };
}
