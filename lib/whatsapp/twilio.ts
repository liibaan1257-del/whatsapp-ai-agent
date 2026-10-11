import "server-only";
import { createHmac } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { safeEqual } from "@/lib/whatsapp/meta";

/** Twilio's WhatsApp body limit is 1600 characters. */
const MAX_BODY = 1600;

/**
 * X-Twilio-Signature check: base64(HMAC-SHA1(auth token, full URL + every
 * POST parameter as key+value, sorted by key)).
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function verifyTwilioSignature(url: string, params: URLSearchParams, header: string | null, authToken: string): boolean {
  if (!header || !authToken) return false;
  const data = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .reduce((acc, [key, value]) => acc + key + value, url);
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");
  return safeEqual(header, expected);
}

export type TwilioInbound = {
  /** The business's Twilio WhatsApp number, E.164 ("+14155238886"). */
  to: string;
  /** Customer number as digits without "+" (same format as Meta's wa_id). */
  from: string;
  name: string | null;
  /** null for media-only messages. */
  text: string | null;
  messageId: string;
};

/** "whatsapp:+252611111111" → "+252611111111" (null if it isn't a WhatsApp number). */
function e164(value: string | null): string | null {
  const m = /^whatsapp:(\+[1-9][0-9]{6,14})$/.exec((value ?? "").trim());
  return m ? m[1] : null;
}

export function parseTwilioInbound(params: URLSearchParams): TwilioInbound | null {
  const to = e164(params.get("To"));
  const from = e164(params.get("From"));
  const messageId = params.get("MessageSid") ?? "";
  if (!to || !from || !/^[A-Za-z0-9]{10,64}$/.test(messageId)) return null;
  const body = (params.get("Body") ?? "").trim();
  return {
    to,
    from: from.slice(1),
    name: params.get("ProfileName")?.trim().slice(0, 120) || null,
    text: body || null,
    messageId,
  };
}

/** Sends a WhatsApp text through Twilio's Messages API. Returns false (and logs) on failure. */
export async function sendTwilioText(fromNumber: string, toDigits: string, body: string): Promise<boolean> {
  const sid = serverEnv.twilioAccountSid();
  const token = serverEnv.twilioAuthToken();
  if (!sid || !token) {
    logger.warn("twilio_send_skipped", { reason: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set" });
    return false;
  }
  const base = (process.env.TWILIO_API_BASE ?? "https://api.twilio.com").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: `whatsapp:${fromNumber}`, To: `whatsapp:+${toDigits}`, Body: body.slice(0, MAX_BODY) }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      logger.error("twilio_send_failed", { status: res.status, code: detail?.code });
      return false;
    }
    return true;
  } catch (error) {
    logger.error("twilio_send_failed", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
