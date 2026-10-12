import "server-only";
import { describeAiError, isAiConfigured, runAgent, type ChatTurn, type Intent } from "@/lib/ai/agent";
import { checkBooking } from "@/lib/ai/booking";
import { isActive, monthStart, replyLimit } from "@/lib/billing";
import { parseKnowledge } from "@/lib/knowledge";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The conversation engine shared by the WhatsApp webhook and the dashboard's
 * chat tester:
 *   save the customer's message → ask the AI → check and save any booking →
 *   save and return the reply.
 *
 * Uses the service-role client because webhook calls have no signed-in user.
 * Callers must pass a businessId they have already verified (webhook: from
 * WhatsApp's phone number id; tester: from the owner's session).
 */

export type Channel = "whatsapp" | "test";

export type IncomingMessage = {
  businessId: string;
  channel: Channel;
  customerPhone: string;
  customerName?: string | null;
  text: string;
  /** Provider message id; repeated deliveries of the same id are ignored. */
  externalId?: string | null;
  /** WhatsApp provider the message came through (replies sent later use the same). */
  provider?: "meta" | "twilio";
};

export type EngineResult =
  | { status: "replied"; conversationId: string; reply: string; intent: Intent; bookingId: string | null }
  | {
      status: "duplicate" | "ai_disabled" | "ai_not_configured" | "rate_limited" | "inactive" | "quota_exceeded";
      conversationId: string | null;
    }
  | { status: "error"; conversationId: string | null; code: string };

/** Messages of history sent to the model. */
const HISTORY = 20;
/** Customer messages per conversation per 10 minutes before the AI stops answering (cost protection). */
const MAX_PER_10_MIN = 20;
const MAX_TEXT = 4000;

export async function handleCustomerMessage(msg: IncomingMessage): Promise<EngineResult> {
  const db = createAdminClient();
  const text = msg.text.trim().slice(0, MAX_TEXT);
  const name = msg.customerName?.trim().slice(0, 120) || null;

  // 1. Find or create the conversation.
  const { data: conv, error: convError } = await db
    .from("conversations")
    .upsert(
      {
        business_id: msg.businessId,
        channel: msg.channel,
        customer_phone: msg.customerPhone,
        status: "open",
        ...(msg.provider ? { provider: msg.provider } : {}),
      },
      { onConflict: "business_id,channel,customer_phone" },
    )
    .select("id, customer_name")
    .single();
  if (convError || !conv) {
    // The message names the problem (e.g. "Invalid API key"); it never contains the key itself.
    logger.error("conversation_upsert_failed", { businessId: msg.businessId, code: convError?.code, error: convError?.message });
    return { status: "error", conversationId: null, code: "db_error" };
  }
  if (name && !conv.customer_name) await db.from("conversations").update({ customer_name: name }).eq("id", conv.id);

  // 2. Save the customer's message (the unique index drops webhook retries).
  if (!text) return { status: "error", conversationId: conv.id, code: "empty_message" };
  const { error: msgError } = await db.from("messages").insert({
    conversation_id: conv.id,
    business_id: msg.businessId,
    role: "customer",
    content: text,
    external_id: msg.externalId ?? null,
  });
  if (msgError?.code === "23505") return { status: "duplicate", conversationId: conv.id };
  if (msgError) {
    logger.error("message_insert_failed", { conversationId: conv.id, code: msgError.code });
    return { status: "error", conversationId: conv.id, code: "db_error" };
  }

  // 3. Is the AI on and allowed to answer?
  const { data: row } = await db.from("business_knowledge").select("*").eq("id", msg.businessId).single();
  if (!row) return { status: "error", conversationId: conv.id, code: "business_not_found" };
  const knowledge = parseKnowledge(row);
  if (!knowledge.ai_enabled) return { status: "ai_disabled", conversationId: conv.id };

  // Plan: access must not have ended, and the month's AI replies must be left.
  if (!isActive(String(row.access_until ?? 0))) {
    logger.info("agent_inactive", { businessId: msg.businessId });
    return { status: "inactive", conversationId: conv.id };
  }
  const { count: used } = await db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("business_id", msg.businessId)
    .eq("role", "assistant")
    .gte("created_at", monthStart().toISOString());
  if ((used ?? 0) >= replyLimit(String(row.plan))) {
    logger.info("agent_quota_exceeded", { businessId: msg.businessId, used });
    return { status: "quota_exceeded", conversationId: conv.id };
  }
  if (!isAiConfigured()) return { status: "ai_not_configured", conversationId: conv.id };

  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conv.id)
    .eq("role", "customer")
    .gte("created_at", since);
  if ((count ?? 0) > MAX_PER_10_MIN) {
    logger.warn("conversation_rate_limited", { conversationId: conv.id });
    return { status: "rate_limited", conversationId: conv.id };
  }

  // 4. Ask the AI, with recent history.
  const { data: rows } = await db
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conv.id)
    .order("id", { ascending: false })
    .limit(HISTORY);
  const history: ChatTurn[] = (rows ?? []).reverse().map((r) => ({ role: r.role, content: r.content }));

  let result;
  try {
    result = await runAgent(knowledge, history);
  } catch (error) {
    const code = describeAiError(error);
    logger.error("ai_failed", { conversationId: conv.id, code, error: error instanceof Error ? error.message : String(error) });
    return { status: "error", conversationId: conv.id, code };
  }
  let { reply } = result.output;
  const { intent, booking, customer_name, language } = result.output;

  // Remember the customer's name and language (used for automatic messages later).
  const convUpdate: Record<string, string> = {};
  if (customer_name && !conv.customer_name && !name) convUpdate.customer_name = customer_name.slice(0, 120);
  if (language && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(language)) convUpdate.language = language.slice(0, 35);
  if (Object.keys(convUpdate).length) await db.from("conversations").update(convUpdate).eq("id", conv.id);

  // 5. A confirmed booking: the server checks it before saving.
  let bookingId: string | null = null;
  if (booking) {
    const { data: existing } = await db
      .from("bookings")
      .select("id, date_time, service_selected, conversation_id")
      .eq("business_id", msg.businessId)
      .in("status", ["pending", "confirmed"])
      .gte("date_time", new Date(Date.now() - 86_400_000).toISOString());
    const all = existing ?? [];
    // Clash check against other customers' bookings; this customer may re-confirm their own slot.
    const check = checkBooking(knowledge, booking, all.filter((b) => b.conversation_id !== conv.id));
    if (check.ok) {
      // The model may repeat a booking it already made: don't save it twice.
      const already = all.find(
        (b) => b.conversation_id === conv.id && new Date(b.date_time).getTime() === check.start.getTime(),
      );
      if (already) {
        bookingId = already.id;
      } else {
        const { data: saved, error } = await db
          .from("bookings")
          .insert({
            business_id: msg.businessId,
            conversation_id: conv.id,
            customer_name: check.customerName,
            phone_number: msg.customerPhone,
            service_selected: check.service,
            date_time: check.start.toISOString(),
            notes: check.notes,
            source: "ai",
          })
          .select("id")
          .single();
        if (error || !saved) {
          logger.error("booking_insert_failed", { conversationId: conv.id, code: error?.code });
          reply = "Sorry, something went wrong saving your booking. A member of our team will contact you.";
        } else {
          bookingId = saved.id;
        }
      }
    } else {
      // Don't let the customer think it's booked. Let the AI explain why in the
      // customer's language; the English explanation is the fallback.
      logger.info("booking_rejected", { conversationId: conv.id, reason: check.reason });
      reply = check.message;
      try {
        const retry = await runAgent(
          knowledge,
          history,
          new Date(),
          `The booking was NOT saved. Reason: ${check.message} Tell the customer this in their language, offer alternatives, and do not fill in "booking" in this reply.`,
        );
        if (!retry.refused && retry.output.reply) reply = retry.output.reply;
      } catch (error) {
        logger.warn("booking_rejection_reply_failed", { code: describeAiError(error) });
      }
    }
  }

  // 6. Save and return the reply.
  const { error: replyError } = await db.from("messages").insert({
    conversation_id: conv.id,
    business_id: msg.businessId,
    role: "assistant",
    content: reply,
    intent,
  });
  if (replyError) logger.error("reply_insert_failed", { conversationId: conv.id, code: replyError.code });

  logger.info("ai_replied", {
    conversationId: conv.id,
    channel: msg.channel,
    intent,
    bookingId,
    refused: result.refused,
    model: result.model,
    outputTokens: result.usage.outputTokens,
    costUsd: result.costUsd,
  });
  return { status: "replied", conversationId: conv.id, reply, intent, bookingId };
}
