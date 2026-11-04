"use server";

import { refresh } from "next/cache";
import { getOwner } from "@/lib/auth/session";
import { requestMessages } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { configStatus } from "@/lib/env";

export type LogoState = { ok?: boolean; error?: string };

const MAX = 120_000;
const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

/**
 * Saves (or removes, when empty) the signed-in owner's business logo. The
 * business id comes from the session, never from the form.
 */
export async function saveLogo(_prev: LogoState, formData: FormData): Promise<LogoState> {
  const m = await requestMessages();
  const owner = await getOwner();
  if (!owner) return { error: m.common.signInAgain };
  if (!configStatus().serviceRole) return { error: m.logo.failed };

  const raw = String(formData.get("logo") ?? "");
  const logo = raw === "" ? null : raw;
  if (logo && (logo.length > MAX || !DATA_URL.test(logo))) return { error: m.logo.invalid };

  const { error } = await createAdminClient().from("business_knowledge").update({ logo }).eq("id", owner.businessId);
  if (error) {
    logger.error("logo_save_failed", { businessId: owner.businessId, code: error.code });
    return { error: m.logo.failed };
  }
  refresh();
  return { ok: true };
}
