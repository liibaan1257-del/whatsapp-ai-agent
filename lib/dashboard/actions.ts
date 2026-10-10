"use server";

import { refresh } from "next/cache";
import { getOwner } from "@/lib/auth/session";
import { testPhoneFor } from "@/lib/dashboard/chat-test";
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
