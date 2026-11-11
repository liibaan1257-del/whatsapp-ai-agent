"use server";

import { refresh } from "next/cache";
import { describeAiError, isAiConfigured } from "@/lib/ai/agent";
import { draftKnowledge } from "@/lib/ai/quick-setup";
import { getOwner } from "@/lib/auth/session";
import { getKnowledge } from "@/lib/dashboard/data";
import { requestMessages } from "@/lib/i18n/server";
import { DAYS, faqSchema, openingSchema, serviceSchema, type Knowledge } from "@/lib/knowledge";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export type QuickSetupState = { ok?: boolean; error?: string; added?: { services: number; faqs: number } };

const MIN = 20;
const MAX = 3000;

/**
 * Fills the knowledge base from a short description (see lib/ai/quick-setup).
 * Adds to what's there and never overwrites what the owner already entered:
 * new services/FAQs are appended (no duplicates), and description, hours,
 * policy and currency are only set when still empty/default.
 */
export async function quickSetup(_prev: QuickSetupState, formData: FormData): Promise<QuickSetupState> {
  const m = await requestMessages();
  const t = m.quickSetup;
  const owner = await getOwner();
  if (!owner) return { error: m.common.signInAgain };
  const text = String(formData.get("text") ?? "").trim();
  if (text.length < MIN) return { error: t.errShort };
  if (text.length > MAX) return { error: t.errLong };
  if (!isAiConfigured()) return { error: t.errAi };

  const current = await getKnowledge();
  if (!current) return { error: t.errFailed };

  let draft;
  try {
    draft = await draftKnowledge(text, current.business_name);
  } catch (error) {
    logger.warn("quick_setup_ai_failed", { ownerId: owner.id, reason: describeAiError(error) });
    return { error: t.errAi };
  }
  if (!draft) return { error: t.errAi };

  const have = new Set(current.services.map((s) => s.name.trim().toLowerCase()));
  const services = draft.services
    .map((s) => serviceSchema.safeParse({ ...s, duration_minutes: Math.min(Math.max(s.duration_minutes || 30, 5), 1440) }))
    .flatMap((r) => (r.success && !have.has(r.data.name.trim().toLowerCase()) ? [r.data] : []))
    .slice(0, Math.max(0, 50 - current.services.length));
  const asked = new Set(current.faqs.map((f) => f.question.trim().toLowerCase()));
  const faqs = draft.faqs
    .map((f) => faqSchema.safeParse(f))
    .flatMap((r) => (r.success && !asked.has(r.data.question.trim().toLowerCase()) ? [r.data] : []))
    .slice(0, Math.max(0, 50 - current.faqs.length));

  const noHoursYet = DAYS.every((d) => !current.working_hours[d]);
  let workingHours: Knowledge["working_hours"] = current.working_hours;
  if (draft.hours_given && noHoursYet) {
    workingHours = Object.fromEntries(
      DAYS.map((d) => {
        const h = draft.working_hours[d];
        const ok = h ? openingSchema.safeParse(h) : null;
        return [d, ok?.success ? ok.data : null];
      }),
    );
  }
  const currency = /^[A-Z]{3}$/.test(draft.currency) && Intl.supportedValuesOf("currency").includes(draft.currency) ? draft.currency : current.currency;

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_knowledge")
    .update({
      description: current.description || draft.description.trim().slice(0, 2000),
      services: [...current.services, ...services],
      faqs: [...current.faqs, ...faqs],
      working_hours: Object.fromEntries(DAYS.map((d) => [d, workingHours[d] ?? null])),
      booking_policy: current.booking_policy || draft.booking_policy.trim().slice(0, 3000),
      // Only replace the default currency, and only when prices were found.
      currency: current.services.length === 0 && current.currency === "USD" && services.some((s) => s.price) ? currency : current.currency,
    })
    .eq("owner_id", owner.id);
  if (error) {
    logger.error("quick_setup_save_failed", { ownerId: owner.id, code: error.code });
    return { error: t.errFailed };
  }
  logger.info("quick_setup_done", { ownerId: owner.id, services: services.length, faqs: faqs.length });
  refresh();
  return { ok: true, added: { services: services.length, faqs: faqs.length } };
}
