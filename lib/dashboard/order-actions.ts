"use server";

import { refresh } from "next/cache";
import { inCustomerLanguage } from "@/lib/ai/agent";
import { getOwner } from "@/lib/auth/session";
import { getKnowledge } from "@/lib/dashboard/data";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendToCustomer, type Provider } from "@/lib/whatsapp/send";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Mark an order new or done (as the owner, under RLS). Marking a WhatsApp
 * order done also messages the customer that it's ready, in their language.
 */
export async function setOrderStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "done" ? "done" : "new";
  if (!UUID.test(id) || !(await getOwner())) return;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, customer_name, phone_number, conversation_id, business_id, conversations(channel, language, provider)")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) {
    logger.error("order_status_failed", { code: error.code });
    return;
  }

  // New → done: tell the WhatsApp customer their order is ready.
  if (order && order.status === "new" && status === "done") {
    const conv = order.conversations as unknown as { channel: string; language: string | null; provider: Provider | null } | null;
    if (conv?.channel === "whatsapp" && order.conversation_id && order.phone_number) {
      await notifyOrderReady(
        order.business_id,
        { customerName: order.customer_name, phone: order.phone_number, conversationId: order.conversation_id },
        conv.language,
        conv.provider,
      );
    }
  }
  refresh();
}

async function notifyOrderReady(
  businessId: string,
  order: { customerName: string; phone: string; conversationId: string },
  language: string | null,
  provider: Provider | null,
): Promise<void> {
  const knowledge = await getKnowledge();
  if (!knowledge) return;
  const english = `Hi ${order.customerName || "there"}, your order is ready! 🎉 Thank you for ordering with us.`;
  const text = await inCustomerLanguage(english, language);
  const sent = await sendToCustomer(knowledge, provider, order.phone.replace(/^\+/, ""), text);
  if (sent) {
    // Keep the chat history complete (messages are server-written only).
    await createAdminClient().from("messages").insert({
      conversation_id: order.conversationId,
      business_id: businessId,
      role: "assistant",
      content: text,
      intent: "other",
    });
  }
}

/** Delete an order. */
export async function deleteOrder(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id) || !(await getOwner())) return;
  const supabase = await createClient();
  await supabase.from("orders").delete().eq("id", id);
  refresh();
}
