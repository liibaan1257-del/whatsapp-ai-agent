import "server-only";
import { parseKnowledge, type Knowledge } from "@/lib/knowledge";
import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard reads, as the signed-in owner (Row Level Security limits every
 * query to their own business).
 */

export async function getKnowledge(): Promise<Knowledge | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("business_knowledge").select("*").maybeSingle();
  return data ? parseKnowledge(data) : null;
}

/** The owner's pending request to connect a WhatsApp number, if any. */
export async function getWhatsAppRequest(): Promise<{ wa_request_number: string | null; wa_requested_at: string | null } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("business_knowledge").select("wa_request_number, wa_requested_at").maybeSingle();
  return data;
}

/** Whether the owner has tried the Chat tester (onboarding step). */
export async function hasTestedChat(): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase.from("conversations").select("id", { count: "exact", head: true }).eq("channel", "test");
  return (count ?? 0) > 0;
}

export type ConversationRow = {
  id: string;
  channel: "whatsapp" | "test";
  customer_phone: string;
  customer_name: string | null;
  status: "open" | "closed";
  last_intent: string | null;
  is_lead: boolean;
  last_message_at: string;
  last_message?: string;
};

export type BookingRow = {
  id: string;
  conversation_id: string | null;
  customer_name: string;
  phone_number: string;
  service_selected: string;
  date_time: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes: string;
  source: "ai" | "manual";
  created_at: string;
  reminder_status?: "sent" | "failed" | "skipped" | null;
  conversations?: { channel: string } | null;
};

export async function getOverview() {
  const supabase = await createClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  const [open, leads, upcoming, pending, recentConvs, nextBookings] = await Promise.all([
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("channel", "whatsapp").eq("status", "open").gte("last_message_at", weekAgo),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("channel", "whatsapp").eq("is_lead", true).gte("created_at", monthAgo),
    supabase.from("bookings").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed"]).gte("date_time", now.toISOString()),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending").gte("date_time", now.toISOString()),
    supabase
      .from("conversations")
      .select("id, channel, customer_phone, customer_name, status, last_intent, is_lead, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(8),
    supabase
      .from("bookings")
      .select("id, conversation_id, customer_name, phone_number, service_selected, date_time, status, notes, source, created_at, conversations(channel)")
      .in("status", ["pending", "confirmed"])
      .gte("date_time", now.toISOString())
      .order("date_time", { ascending: true })
      .limit(6),
  ]);

  const conversations = (recentConvs.data ?? []) as ConversationRow[];
  // Last message preview per conversation.
  if (conversations.length) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id, content, id")
      .in("conversation_id", conversations.map((c) => c.id))
      .order("id", { ascending: false })
      .limit(80);
    for (const c of conversations) c.last_message = msgs?.find((m) => m.conversation_id === c.id)?.content;
  }

  return {
    stats: {
      openConversations: open.count ?? 0,
      leads: leads.count ?? 0,
      upcomingBookings: upcoming.count ?? 0,
      pendingBookings: pending.count ?? 0,
    },
    conversations,
    bookings: (nextBookings.data ?? []) as unknown as BookingRow[],
  };
}
