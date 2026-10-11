"use server";

import { refresh } from "next/cache";
import { getOwner } from "@/lib/auth/session";
import { isValidTimeZone, knowledgeSchema } from "@/lib/knowledge";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export type KnowledgeState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

/**
 * Saves the knowledge base. Validated with the same schema the AI uses, then
 * written as the signed-in owner (RLS + column grants limit it to their own
 * business and to these fields).
 */
export async function saveKnowledge(payload: unknown): Promise<KnowledgeState> {
  const owner = await getOwner();
  if (!owner) return { error: "Please sign in again." };

  const parsed = knowledgeSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const k = parsed.data;
  if (!Intl.supportedValuesOf("currency").includes(k.currency)) {
    return { error: "Choose a valid currency.", fieldErrors: { currency: "Unknown currency." } };
  }
  if (!isValidTimeZone(k.timezone)) return { error: "Choose a valid time zone.", fieldErrors: { timezone: "Unknown time zone." } };

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
      return { error: "That WhatsApp phone number ID is already connected to another business.", fieldErrors: { whatsapp_phone_number_id: "Already in use." } };
    }
    if (error.message.includes("invalid_timezone")) return { error: "Choose a valid time zone.", fieldErrors: { timezone: "Unknown time zone." } };
    logger.error("knowledge_save_failed", { ownerId: owner.id, code: error.code });
    return { error: "Couldn't save. Please try again." };
  }
  refresh();
  return { ok: true };
}
