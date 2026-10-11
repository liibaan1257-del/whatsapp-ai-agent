import "server-only";
import type { Knowledge } from "@/lib/knowledge";
import { sendText } from "@/lib/whatsapp/meta";
import { sendTwilioText } from "@/lib/whatsapp/twilio";

export type Provider = "meta" | "twilio";

/**
 * Sends a WhatsApp message to a customer through the provider they wrote in
 * on (falls back to whichever one the business has set up).
 */
export async function sendToCustomer(knowledge: Knowledge, provider: Provider | null, toDigits: string, text: string): Promise<boolean> {
  const meta = knowledge.whatsapp_phone_number_id;
  const twilio = knowledge.twilio_whatsapp_number;
  const use: Provider | null = provider === "twilio" && twilio ? "twilio" : provider === "meta" && meta ? "meta" : meta ? "meta" : twilio ? "twilio" : null;
  if (use === "meta" && meta) return sendText(meta, toDigits, text);
  if (use === "twilio" && twilio) return sendTwilioText(twilio, toDigits, text);
  return false;
}
