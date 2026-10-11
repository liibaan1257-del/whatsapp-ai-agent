"use server";

import { refresh } from "next/cache";
import { getOwner } from "@/lib/auth/session";
import { getKnowledge } from "@/lib/dashboard/data";
import { inCustomerLanguage } from "@/lib/ai/agent";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatInZone, zonedToUtc } from "@/lib/time";
import { sendText } from "@/lib/whatsapp/meta";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Status = "pending" | "confirmed" | "cancelled" | "completed";

/** Allowed status changes. */
const NEXT: Record<Status, Status[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  cancelled: [],
  completed: [],
};

export type BookingActionState = { ok?: boolean; error?: string; notice?: string };

/**
 * Confirm / cancel / complete a booking (as the owner, under RLS). For
 * WhatsApp bookings, confirming or cancelling also messages the customer.
 */
export async function updateBookingStatus(_prev: BookingActionState, formData: FormData): Promise<BookingActionState> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as Status;
  if (!UUID.test(id) || !(status in NEXT)) return { error: "Invalid request." };
  const owner = await getOwner();
  if (!owner) return { error: "Please sign in again." };

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, customer_name, service_selected, date_time, phone_number, conversation_id, conversations(channel, language)")
    .eq("id", id)
    .maybeSingle();
  if (!booking) return { error: "Booking not found." };
  if (!NEXT[booking.status as Status].includes(status)) return { error: `A ${booking.status} booking can't become ${status}.` };

  const { error } = await supabase.from("bookings").update({ status }).eq("id", id).eq("status", booking.status);
  if (error) {
    logger.error("booking_status_failed", { bookingId: id, code: error.code });
    return { error: "Couldn't update the booking." };
  }

  let notice: string | undefined;
  const conv = booking.conversations as unknown as { channel: string; language: string | null } | null;
  const channel = conv?.channel;
  if ((status === "confirmed" || status === "cancelled") && channel === "whatsapp" && booking.conversation_id) {
    notice = (await notifyCustomer(owner.businessId, booking, status, conv?.language ?? null)) ? "Customer notified on WhatsApp." : "Saved, but the WhatsApp message couldn't be sent.";
  }
  refresh();
  return { ok: true, notice };
}

async function notifyCustomer(
  businessId: string,
  b: { customer_name: string; service_selected: string; date_time: string; phone_number: string; conversation_id: string | null },
  status: "confirmed" | "cancelled",
  language: string | null,
): Promise<boolean> {
  const knowledge = await getKnowledge();
  const phoneNumberId = knowledge?.whatsapp_phone_number_id;
  if (!knowledge || !phoneNumberId) return false;
  const when = formatInZone(new Date(b.date_time), knowledge.timezone, knowledge.time_format);
  const english =
    status === "confirmed"
      ? `Hi ${b.customer_name}, your booking for ${b.service_selected} on ${when} is confirmed. See you then!`
      : `Hi ${b.customer_name}, your booking for ${b.service_selected} on ${when} has been cancelled. Reply here if you'd like a new time.`;
  // Written in the language the customer used in the chat.
  const text = await inCustomerLanguage(english, language);
  const sent = await sendText(phoneNumberId, b.phone_number, text);
  if (sent && b.conversation_id) {
    // Keep the chat history complete (messages are server-written only).
    await createAdminClient().from("messages").insert({
      conversation_id: b.conversation_id,
      business_id: businessId,
      role: "assistant",
      content: text,
      intent: "booking",
    });
  }
  return sent;
}

/** Deletes a cancelled booking. */
export async function deleteBooking(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id) || !(await getOwner())) return;
  const supabase = await createClient();
  await supabase.from("bookings").delete().eq("id", id).eq("status", "cancelled");
  refresh();
}

export type AddBookingState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

/** Adds a booking by hand (phone or walk-in). Opening hours aren't enforced: the owner decides. */
export async function addBooking(_prev: AddBookingState, formData: FormData): Promise<AddBookingState> {
  const owner = await getOwner();
  if (!owner) return { error: "Please sign in again." };
  const knowledge = await getKnowledge();
  const tz = knowledge?.timezone ?? "UTC";

  const customer = String(formData.get("customer_name") ?? "").trim();
  const phone = String(formData.get("phone_number") ?? "").trim();
  const service = String(formData.get("service_selected") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const status = formData.get("status") === "pending" ? "pending" : "confirmed";

  const fieldErrors: Record<string, string> = {};
  if (!customer || customer.length > 120) fieldErrors.customer_name = "Enter the customer's name (max 120).";
  if (!/^\+?[0-9 ()-]{6,32}$/.test(phone)) fieldErrors.phone_number = "Enter a phone number with country code, e.g. +1 555 010 0100.";
  if (!service || service.length > 200) fieldErrors.service_selected = "Choose a service.";
  if (notes.length > 1000) fieldErrors.notes = "At most 1000 characters.";
  const start = zonedToUtc(date, time, tz);
  if (!start) fieldErrors.date = "Choose a valid date and time.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.from("bookings").insert({
    business_id: owner.businessId,
    customer_name: customer,
    phone_number: phone.replace(/[ ()-]/g, ""),
    service_selected: service,
    date_time: start!.toISOString(),
    notes,
    status,
    source: "manual",
  });
  if (error) {
    logger.error("booking_add_failed", { code: error.code });
    return { error: "Couldn't add the booking." };
  }
  refresh();
  return { ok: true };
}
