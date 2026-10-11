import { after, type NextRequest } from "next/server";
import { handleCustomerMessage } from "@/lib/agent/engine";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseTwilioInbound, sendTwilioText, verifyTwilioSignature, type TwilioInbound } from "@/lib/whatsapp/twilio";

/** Time for the AI and the reply after Twilio has its answer (seconds). */
export const maxDuration = 60;

const MAX_BODY_BYTES = 64 * 1024;
const UNSUPPORTED_REPLY = "Thanks! For now I can only read text messages. Please type your question.";
/** Empty TwiML: "received, no reply here" (the reply is sent separately via the API). */
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

/**
 * The public URL Twilio called, which the signature covers. Behind Vercel's
 * proxy the request URL is internal, so rebuild it from the forwarded headers.
 */
function publicUrl(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`;
}

/**
 * POST /api/whatsapp/twilio — incoming WhatsApp messages from Twilio
 * (Twilio Console → Messaging → WhatsApp sender → "When a message comes in").
 * Checks X-Twilio-Signature, answers right away, then runs the AI and sends
 * the reply through Twilio's API in the background.
 */
export async function POST(request: NextRequest) {
  const authToken = serverEnv.twilioAuthToken();
  if (!authToken || !serverEnv.twilioAccountSid()) {
    logger.error("missing_config", { variable: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN" });
    return Response.json({ error: "not_configured" }, { status: 500 });
  }
  if (!request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
    return Response.json({ error: "unsupported_media_type" }, { status: 415 });
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return Response.json({ error: "payload_too_large" }, { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return Response.json({ error: "payload_too_large" }, { status: 413 });

  const params = new URLSearchParams(raw);
  if (!verifyTwilioSignature(publicUrl(request), params, request.headers.get("x-twilio-signature"), authToken)) {
    logger.warn("twilio_bad_signature");
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  const message = parseTwilioInbound(params);
  if (message) after(() => processMessage(message));
  else logger.info("twilio_ignored", { reason: "not a WhatsApp message" });
  return new Response(EMPTY_TWIML, { headers: { "Content-Type": "text/xml" } });
}

async function processMessage(m: TwilioInbound) {
  try {
    // Route by the business's Twilio WhatsApp number (set on the Knowledge page).
    const { data: business } = await createAdminClient()
      .from("business_knowledge")
      .select("id")
      .eq("twilio_whatsapp_number", m.to)
      .maybeSingle();
    if (!business) {
      logger.warn("twilio_unknown_number", { to: m.to });
      return;
    }
    if (m.text === null) {
      await sendTwilioText(m.to, m.from, UNSUPPORTED_REPLY);
      logger.info("twilio_unsupported_type");
      return;
    }
    const result = await handleCustomerMessage({
      businessId: business.id,
      channel: "whatsapp",
      customerPhone: m.from,
      customerName: m.name,
      text: m.text,
      externalId: m.messageId,
      provider: "twilio",
    });
    if (result.status === "replied") await sendTwilioText(m.to, m.from, result.reply);
    else logger.info("twilio_no_reply", { status: result.status, conversationId: result.conversationId });
  } catch (error) {
    logger.error("twilio_processing_failed", { error: error instanceof Error ? error.message : String(error) });
  }
}
