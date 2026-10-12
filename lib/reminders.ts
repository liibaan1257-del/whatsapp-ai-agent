import "server-only";
import { inCustomerLanguage } from "@/lib/ai/agent";
import { isActive } from "@/lib/billing";
import { parseKnowledge, type Knowledge } from "@/lib/knowledge";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatInZone } from "@/lib/time";
import { sendTemplate } from "@/lib/whatsapp/meta";
import { sendToCustomer, type Provider } from "@/lib/whatsapp/send";

/** Confirmed bookings starting between 1 and 25 hours from now get a reminder (the job runs daily). */
const FROM_HOURS = 1;
const TO_HOURS = 25;
/** WhatsApp allows free text this long after the customer's last message (a little under 24h, to be safe). */
const FREE_TEXT_WINDOW_MS = 23.5 * 3_600_000;

type Due = {
  id: string;
  business_id: string;
  conversation_id: string | null;
  customer_name: string;
  phone_number: string;
  service_selected: string;
  date_time: string;
  conversations: { channel: string; provider: Provider | null; language: string | null } | null;
};

export type ReminderSummary = { due: number; sent: number; failed: number; skipped: number };

/**
 * Sends tomorrow's appointment reminders. Inside the 24-hour window: a free
 * text in the customer's language; outside it on Meta: the business's
 * approved template. Every booking is marked so it's never reminded twice.
 */
export async function sendDueReminders(now: Date = new Date()): Promise<ReminderSummary> {
  const db = createAdminClient();
  const summary: ReminderSummary = { due: 0, sent: 0, failed: 0, skipped: 0 };
  const { data, error } = await db
    .from("bookings")
    .select("id, business_id, conversation_id, customer_name, phone_number, service_selected, date_time, conversations(channel, provider, language)")
    .eq("status", "confirmed")
    .is("reminder_status", null)
    .gte("date_time", new Date(now.getTime() + FROM_HOURS * 3_600_000).toISOString())
    .lte("date_time", new Date(now.getTime() + TO_HOURS * 3_600_000).toISOString())
    .limit(500);
  if (error) {
    logger.error("reminders_query_failed", { code: error.code });
    return summary;
  }
  const bookings = (data ?? []) as unknown as Due[];
  summary.due = bookings.length;

  const businesses = new Map<string, { knowledge: Knowledge; active: boolean } | null>();
  for (const b of bookings) {
    let business = businesses.get(b.business_id);
    if (business === undefined) {
      const { data: row } = await db.from("business_knowledge").select("*").eq("id", b.business_id).maybeSingle();
      business = row ? { knowledge: parseKnowledge(row), active: isActive(String(row.access_until ?? 0), now) } : null;
      businesses.set(b.business_id, business);
    }
    const status = business ? await remind(db, b, business.knowledge, business.active, now) : "skipped";
    summary[status] += 1;
    await db.from("bookings").update({ reminder_status: status, reminder_at: now.toISOString() }).eq("id", b.id);
  }
  logger.info("reminders_done", summary);
  return summary;
}

async function remind(
  db: ReturnType<typeof createAdminClient>,
  b: Due,
  k: Knowledge,
  active: boolean,
  now: Date,
): Promise<"sent" | "failed" | "skipped"> {
  // Only real WhatsApp customers, for businesses that want reminders and are paid up.
  if (!k.reminders_enabled || !active || !b.conversation_id || b.conversations?.channel !== "whatsapp") return "skipped";
  const to = b.phone_number.replace(/^\+/, "");
  const when = formatInZone(new Date(b.date_time), k.timezone, k.time_format);
  const business = k.business_name || "us";

  const { data: last } = await db
    .from("messages")
    .select("created_at")
    .eq("conversation_id", b.conversation_id)
    .eq("role", "customer")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const insideWindow = last ? now.getTime() - new Date(last.created_at).getTime() < FREE_TEXT_WINDOW_MS : false;

  let sent = false;
  let text: string;
  if (insideWindow) {
    const english = `Hi ${b.customer_name} 👋\n\nJust a friendly reminder of your ${b.service_selected} appointment at ${business} 📅 ${when}\n\nWe're looking forward to seeing you! ✨\nNeed to change the time? Simply reply to this message.`;
    text = await inCustomerLanguage(english, b.conversations?.language ?? null);
    sent = await sendToCustomer(k, b.conversations?.provider ?? null, to, text);
  } else if (k.whatsapp_phone_number_id && b.conversations?.provider !== "twilio") {
    // Template body: "Hi {{1}} 👋 … your {{2}} appointment at {{3}} 📅 {{4}} …"
    text = `Reminder: ${b.customer_name}, ${b.service_selected}, ${business}, ${when}`;
    sent = await sendTemplate(k.whatsapp_phone_number_id, to, k.reminder_template, k.reminder_template_lang, [b.customer_name, b.service_selected, business, when]);
  } else {
    // Twilio outside the window needs a Content template: not set up, so skip.
    return "skipped";
  }

  if (sent) {
    await db.from("messages").insert({ conversation_id: b.conversation_id, business_id: b.business_id, role: "assistant", content: text, intent: "booking" });
  }
  return sent ? "sent" : "failed";
}
