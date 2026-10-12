import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Meta WhatsApp Cloud API: webhook verification, signature check, payload
 * parsing and sending text replies.
 */

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Checks Meta's `X-Hub-Signature-256: sha256=<hex HMAC of the raw body>`. */
export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  return safeEqual(header.slice("sha256=".length), expected);
}

export type InboundMessage = {
  phoneNumberId: string;
  from: string;
  name: string | null;
  messageId: string;
  /** Text content; null for media and other non-text messages. */
  text: string | null;
  type: string;
};

type Payload = {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: {
          id?: string;
          from?: string;
          type?: string;
          text?: { body?: string };
          button?: { text?: string };
          interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
        }[];
      };
    }[];
  }[];
};

/** Customer messages in a webhook payload (status updates and other events are skipped). */
export function parseInbound(body: unknown): InboundMessage[] {
  const payload = body as Payload;
  if (payload?.object !== "whatsapp_business_account") return [];
  const out: InboundMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (change.field !== "messages" || !phoneNumberId) continue;
      for (const m of value?.messages ?? []) {
        if (!m.id || !m.from) continue;
        const contact = value?.contacts?.find((c) => c.wa_id === m.from) ?? value?.contacts?.[0];
        const text =
          m.type === "text"
            ? (m.text?.body ?? null)
            : m.type === "button"
              ? (m.button?.text ?? null)
              : m.type === "interactive"
                ? (m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? null)
                : null;
        out.push({
          phoneNumberId,
          from: m.from,
          name: contact?.profile?.name ?? null,
          messageId: m.id,
          text,
          type: m.type ?? "unknown",
        });
      }
    }
  }
  return out;
}

/** WhatsApp's limit for one text message body. */
const MAX_BODY = 4096;

/** Sends a text message from the business's number. Returns false (and logs) on failure. */
export async function sendText(phoneNumberId: string, to: string, body: string): Promise<boolean> {
  const token = serverEnv.whatsappAccessToken();
  if (!token) {
    logger.warn("whatsapp_send_skipped", { reason: "WHATSAPP_ACCESS_TOKEN not set" });
    return false;
  }
  const base = (process.env.WHATSAPP_API_BASE ?? "https://graph.facebook.com").replace(/\/+$/, "");
  const url = `${base}/${serverEnv.whatsappGraphVersion()}/${encodeURIComponent(phoneNumberId)}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: body.slice(0, MAX_BODY) },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      logger.error("whatsapp_send_failed", { status: res.status, code: detail?.error?.code, type: detail?.error?.type });
      return false;
    }
    return true;
  } catch (error) {
    logger.error("whatsapp_send_failed", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Sends an approved message template (needed outside WhatsApp's 24-hour
 * window). Body parameters fill {{1}}, {{2}}, … in order.
 */
export async function sendTemplate(phoneNumberId: string, to: string, name: string, language: string, params: string[]): Promise<boolean> {
  const token = serverEnv.whatsappAccessToken();
  if (!token) {
    logger.warn("whatsapp_send_skipped", { reason: "WHATSAPP_ACCESS_TOKEN not set" });
    return false;
  }
  const base = (process.env.WHATSAPP_API_BASE ?? "https://graph.facebook.com").replace(/\/+$/, "");
  const url = `${base}/${serverEnv.whatsappGraphVersion()}/${encodeURIComponent(phoneNumberId)}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name,
          language: { code: language },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text: text.slice(0, 1000) })) }],
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      logger.error("whatsapp_template_failed", { status: res.status, code: detail?.error?.code, template: name });
      return false;
    }
    return true;
  } catch (error) {
    logger.error("whatsapp_template_failed", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
