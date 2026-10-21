/**
 * The operator's public contact details (optional, set in Vercel). Both are
 * NEXT_PUBLIC_*, i.e. inlined at build time: redeploy after changing them.
 */
export function contactEmail(): string | null {
  const email = (process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** The operator's WhatsApp number, used when NEXT_PUBLIC_CONTACT_WHATSAPP isn't set. */
const DEFAULT_CONTACT_WHATSAPP = "+256788653618";

/** WhatsApp number as written ("+252 61 234 5678") → { display, link } for wa.me, or null. */
export function contactWhatsapp(): { display: string; link: string } | null {
  const raw = (process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || DEFAULT_CONTACT_WHATSAPP).trim();
  const digits = raw.replace(/[\s()+-]/g, "");
  if (!/^[1-9][0-9]{6,14}$/.test(digits)) return null;
  return { display: `+${digits}`, link: `https://wa.me/${digits}` };
}

/** Where customers send their payment (shown on the owner's Settings page). */
export const PAYMENT_ACCOUNTS = [
  { method: "EVC Plus", number: "0618710974", name: "Liban Salah Abdullahi" },
  { method: "Premier Bank", number: "0615690242", name: "Cabdullahi Sheikh Ahmed Mahomuud" },
] as const;
