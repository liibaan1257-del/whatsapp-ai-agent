import "server-only";
import { formatDateTime } from "@/lib/format";
import type { Knowledge } from "@/lib/knowledge";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/notify";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

/** The business owner's login email, or null. */
async function ownerEmail(businessId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data: biz } = await db.from("business_knowledge").select("owner_id").eq("id", businessId).maybeSingle();
  if (!biz) return null;
  const { data: profile } = await db.from("profiles").select("email").eq("id", biz.owner_id).maybeSingle();
  return profile?.email ?? null;
}

/** Emails the owner that the AI booked a WhatsApp customer, so they can confirm it. Best effort. */
export async function notifyOwnerOfBooking(
  businessId: string,
  knowledge: Knowledge,
  booking: { customerName: string; phone: string; service: string; start: Date },
): Promise<void> {
  try {
    const to = await ownerEmail(businessId);
    if (!to) return;
    const when = formatDateTime(booking.start.toISOString(), knowledge.timezone, knowledge.time_format);
    await sendEmail({
      to,
      subject: `New booking / Ballan cusub: ${booking.customerName} – ${booking.service}, ${when}`,
      text: [
        "New booking from WhatsApp / Ballan cusub oo WhatsApp ka timid",
        "",
        `Customer / Macmiil: ${booking.customerName} (+${booking.phone})`,
        `Service / Adeeg: ${booking.service}`,
        `Time / Waqti: ${when}`,
        "",
        `Confirm it / Xaqiiji: ${siteUrl()}/dashboard/bookings`,
      ].join("\n"),
    });
  } catch (error) {
    logger.warn("owner_booking_notify_failed", { error: String(error) });
  }
}
