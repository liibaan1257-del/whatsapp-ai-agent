"use server";

import { after } from "next/server";
import { refresh } from "next/cache";
import { getOwner } from "@/lib/auth/session";
import { configStatus } from "@/lib/env";
import { requestMessages } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { notifyOperator } from "@/lib/notify";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

export type WhatsAppRequestState = { ok?: boolean; error?: string };

const E164 = /^\+[1-9]\d{7,14}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_ID = /^\d{5,30}$/;

/**
 * Owner: ask the operator to connect a WhatsApp number to their business.
 * Stores the number on the owner's own business (looked up from the session,
 * never from the form) and emails the operator.
 */
export async function requestWhatsAppConnection(_prev: WhatsAppRequestState, formData: FormData): Promise<WhatsAppRequestState> {
  const m = await requestMessages();
  const t = m.waRequest;
  const owner = await getOwner();
  if (!owner) return { error: m.common.signInAgain };
  if (!configStatus().serviceRole) return { error: t.failed };

  const number = String(formData.get("number") ?? "").replace(/[\s()-]/g, "");
  if (!E164.test(number)) return { error: t.badNumber };
  if (formData.get("not_on_app") !== "on") return { error: t.confirmRequired };

  const db = createAdminClient();
  const { data: business, error } = await db
    .from("business_knowledge")
    .update({ wa_request_number: number, wa_requested_at: new Date().toISOString() })
    .eq("id", owner.businessId)
    .select("business_name")
    .maybeSingle();
  if (error || !business) {
    logger.error("wa_request_failed", { ownerId: owner.id, code: error?.code });
    return { error: t.failed };
  }

  logger.info("wa_request_saved", { ownerId: owner.id });
  after(() =>
    notifyOperator(
      `WhatsApp connection request: ${business.business_name || owner.email}`,
      [
        "A business asked to connect WhatsApp.",
        "",
        `Business: ${business.business_name || "(no name yet)"}`,
        `Owner: ${owner.fullName ?? ""} <${owner.email ?? ""}>`,
        `Number to connect: ${number}`,
        "",
        "1. Meta → WhatsApp → Production setup → Add new number (display name = the business name).",
        "2. The owner reads you the verification code.",
        `3. Paste the new Phone number ID on ${siteUrl()}/dashboard/admin`,
      ].join("\n"),
    ),
  );
  refresh();
  return { ok: true };
}

export type AdminPhoneState = { ok?: boolean; error?: string };

/** Operator: set (or clear) the Meta phone number ID of any business; clears its pending request. */
export async function setBusinessPhoneId(_prev: AdminPhoneState, formData: FormData): Promise<AdminPhoneState> {
  const m = await requestMessages();
  const owner = await getOwner();
  if (!owner?.isAdmin) return { error: m.admin.failed };
  if (!configStatus().serviceRole) return { error: m.admin.notConfigured };

  const id = String(formData.get("business_id") ?? "");
  const phoneId = String(formData.get("phone_id") ?? "").replace(/\s/g, "");
  if (!UUID.test(id) || (phoneId && !PHONE_ID.test(phoneId))) return { error: m.knowledge.errors.phoneDigits };

  const { error } = await createAdminClient()
    .from("business_knowledge")
    .update(phoneId ? { whatsapp_phone_number_id: phoneId, wa_request_number: null, wa_requested_at: null } : { whatsapp_phone_number_id: null })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: m.knowledge.errors.phoneInUse };
    logger.error("admin_phone_failed", { businessId: id, code: error.code });
    return { error: m.admin.failed };
  }
  logger.info("admin_phone_set", { by: owner.id, businessId: id, cleared: !phoneId });
  refresh();
  return { ok: true };
}
