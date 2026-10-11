"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getOwner } from "@/lib/auth/session";
import { testPhoneFor } from "@/lib/dashboard/chat-test";
import { requestMessages } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Open or close a conversation (RLS: only the owner's own). */
export async function setConversationStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status");
  if (!UUID.test(id) || (status !== "open" && status !== "closed")) return;
  if (!(await getOwner())) return;
  const supabase = await createClient();
  await supabase.from("conversations").update({ status }).eq("id", id);
  refresh();
}

/** Deletes the owner's test conversation and the test bookings it created. */
export async function resetTestConversation(): Promise<void> {
  const owner = await getOwner();
  if (!owner) return;
  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("channel", "test")
    .eq("customer_phone", testPhoneFor(owner.id))
    .maybeSingle();
  if (conv) {
    await supabase.from("bookings").delete().eq("conversation_id", conv.id);
    await supabase.from("conversations").delete().eq("id", conv.id);
  }
  refresh();
}

export type DeleteConversationState = { error?: string };

/**
 * Erases one customer's conversation: its messages (cascade) and the bookings
 * made in it. For "please delete my data" requests from a customer.
 */
export async function deleteConversation(_prev: DeleteConversationState, formData: FormData): Promise<DeleteConversationState> {
  const m = await requestMessages();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: m.conversation.deleteFailed };
  if (!(await getOwner())) return { error: m.common.signInAgain };
  const supabase = await createClient();
  // RLS: both deletes only touch the owner's own rows.
  const { error: bookingsError } = await supabase.from("bookings").delete().eq("conversation_id", id);
  const { data, error } = await supabase.from("conversations").delete().eq("id", id).select("id");
  if (bookingsError || error || !data?.length) {
    logger.error("conversation_delete_failed", { conversationId: id, code: (bookingsError ?? error)?.code ?? "not_found" });
    return { error: m.conversation.deleteFailed };
  }
  redirect("/dashboard");
}
