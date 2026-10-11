"use server";

import { refresh } from "next/cache";
import { getOwner } from "@/lib/auth/session";
import type { Messages } from "@/lib/i18n/dictionaries";
import { requestMessages } from "@/lib/i18n/server";
import { isValidTimeZone, knowledgeSchema } from "@/lib/knowledge";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export type KnowledgeState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

/** A validation problem in the dashboard language, chosen by the field it's about. */
function fieldMessage(path: PropertyKey[], e: Messages["knowledge"]["errors"]): string {
  const [top] = path;
  const last = path.at(-1);
  if (top === "working_hours") return last === "open" || last === "close" ? e.hhmm : e.hoursOrder;
  if (last === "duration_minutes") return e.duration;
  if (last === "name" || last === "question" || last === "answer") return e.required;
  if (top === "whatsapp_phone_number_id") return e.phoneDigits;
  if (top === "currency") return e.currency;
  if (top === "timezone") return e.timezone;
  return e.invalid;
}

/**
 * Saves the knowledge base. Validated with the same schema the AI uses, then
 * written as the signed-in owner (RLS + column grants limit it to their own
 * business and to these fields).
 */
export async function saveKnowledge(payload: unknown): Promise<KnowledgeState> {
  const m = await requestMessages();
  const e = m.knowledge.errors;
  const owner = await getOwner();
  if (!owner) return { error: m.common.signInAgain };

  const parsed = knowledgeSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= fieldMessage(issue.path, e);
    }
    return { error: e.fix, fieldErrors };
  }
  const k = parsed.data;
  if (!Intl.supportedValuesOf("currency").includes(k.currency)) {
    return { error: e.currency, fieldErrors: { currency: e.currency } };
  }
  if (!isValidTimeZone(k.timezone)) return { error: e.timezone, fieldErrors: { timezone: e.timezone } };

  // Closed days are stored as null so the AI sees every day explicitly.
  const supabase = await createClient();
  const { error } = await supabase
    .from("business_knowledge")
    .update({
      business_name: k.business_name,
      description: k.description,
      services: k.services,
      working_hours: k.working_hours,
      faqs: k.faqs,
      booking_policy: k.booking_policy,
      timezone: k.timezone,
      currency: k.currency,
      time_format: k.time_format,
      whatsapp_phone_number_id: k.whatsapp_phone_number_id || null,
      ai_enabled: k.ai_enabled,
    })
    .eq("owner_id", owner.id);

  if (error) {
    if (error.code === "23505") {
      return { error: e.phoneInUse, fieldErrors: { whatsapp_phone_number_id: e.inUse } };
    }
    if (error.message.includes("invalid_timezone")) return { error: e.timezone, fieldErrors: { timezone: e.timezone } };
    logger.error("knowledge_save_failed", { ownerId: owner.id, code: error.code });
    return { error: e.saveFailed };
  }
  refresh();
  return { ok: true };
}
