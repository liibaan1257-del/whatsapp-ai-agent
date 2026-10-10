import { after, connection, type NextRequest } from "next/server";
import { handleCustomerMessage } from "@/lib/agent/engine";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseInbound, safeEqual, sendText, verifySignature, type InboundMessage } from "@/lib/whatsapp/meta";

/** Time for the AI and the reply after Meta has its 200 (seconds). */
export const maxDuration = 60;

const MAX_BODY_BYTES = 256 * 1024;
const UNSUPPORTED_REPLY = "Thanks! For now I can only read text messages. Please type your question.";

/**
 * GET /api/whatsapp/webhook — Meta's one-time verification handshake.
 * Echoes hub.challenge only when hub.verify_token matches WHATSAPP_VERIFY_TOKEN.
 */
export async function GET(request: NextRequest) {
  await connection();
  const params = request.nextUrl.searchParams;
  const expected = serverEnv.whatsappVerifyToken();
  const token = params.get("hub.verify_token") ?? "";
  if (params.get("hub.mode") === "subscribe" && expected && safeEqual(token, expected)) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  logger.warn("webhook_verify_failed");
  return new Response("Forbidden", { status: 403 });
}

/**
 * POST /api/whatsapp/webhook — incoming WhatsApp messages.
 * Checks Meta's signature, answers 200 right away (Meta retries slow or
 * failed deliveries), then runs the AI and sends the reply in the background.
 */
export async function POST(request: NextRequest) {
  const appSecret = serverEnv.whatsappAppSecret();
  if (!appSecret) {
    logger.error("missing_config", { variable: "WHATSAPP_APP_SECRET" });
    return Response.json({ error: "not_configured" }, { status: 500 });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return Response.json({ error: "payload_too_large" }, { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return Response.json({ error: "payload_too_large" }, { status: 413 });

  if (!verifySignature(raw, request.headers.get("x-hub-signature-256"), appSecret)) {
    logger.warn("webhook_bad_signature");
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const messages = parseInbound(body);
  if (messages.length) after(() => processMessages(messages));
  return Response.json({ received: true, messages: messages.length });
}

async function processMessages(messages: InboundMessage[]) {
  const db = createAdminClient();
  for (const m of messages) {
    try {
      // Route by the business's WhatsApp phone number id (set on the Knowledge page).
      const { data: business } = await db
        .from("business_knowledge")
        .select("id")
        .eq("whatsapp_phone_number_id", m.phoneNumberId)
        .maybeSingle();
      if (!business) {
        logger.warn("webhook_unknown_number", { phoneNumberId: m.phoneNumberId });
        continue;
      }

      if (m.text === null) {
        await sendText(m.phoneNumberId, m.from, UNSUPPORTED_REPLY);
        logger.info("webhook_unsupported_type", { type: m.type });
        continue;
      }

      const result = await handleCustomerMessage({
        businessId: business.id,
        channel: "whatsapp",
        customerPhone: m.from,
        customerName: m.name,
        text: m.text,
        externalId: m.messageId,
      });
      if (result.status === "replied") await sendText(m.phoneNumberId, m.from, result.reply);
      else logger.info("webhook_no_reply", { status: result.status, conversationId: result.conversationId });
    } catch (error) {
      logger.error("webhook_processing_failed", { error: error instanceof Error ? error.message : String(error) });
    }
  }
}
