/**
 * Payment line added to debt reminders, e.g. "📲 Ku bixi EVC Plus: *712*615123456*12#".
 * Safe anywhere (no server-only imports).
 */

export const PAY_METHODS = ["evc", "zaad", "edahab", "sahal", "mpesa", "bank", "other"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

export function isPayMethod(v: unknown): v is PayMethod {
  return typeof v === "string" && (PAY_METHODS as readonly string[]).includes(v);
}

/** USSD "send money" codes the customer can dial with the amount filled in (USD wallets). */
const USSD: Partial<Record<PayMethod, string>> = { evc: "712", zaad: "220" };

/** "+252 61 512 3456" / "0615123456" / "252615123456" → "615123456" (the local form the wallets dial). */
function localNumber(raw: string): string {
  const d = raw.replace(/\D/g, "");
  return d.replace(/^252/, "").replace(/^0+/, "");
}

/**
 * What to pay with: a dialable code for EVC Plus / Zaad when the amount is in USD,
 * otherwise the method and number as the owner wrote them. null when not set up.
 */
export function payCode(method: string | null, number: string | null, amount: number, currency: string): string | null {
  if (!isPayMethod(method) || !number?.trim()) return null;
  const ussd = USSD[method];
  const local = localNumber(number);
  if (ussd && currency === "USD" && /^\d{7,12}$/.test(local) && amount > 0) {
    const amt = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
    return `*${ussd}*${local}*${amt}#`;
  }
  return number.trim();
}
