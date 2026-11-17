/** Phone number helpers (no server-only imports: safe anywhere). */

/** Country calling codes for the places owners sign up from, keyed by the visitor's country (Vercel IP header). */
export const CALLING_CODES: Record<string, string> = {
  SO: "252", ET: "251", DJ: "253", KE: "254", UG: "256", TZ: "255", YE: "967", SA: "966", AE: "971", EG: "20",
  TR: "90", GB: "44", SE: "46", NO: "47", DK: "45", FI: "358", DE: "49", NL: "31", BE: "32", FR: "33", IT: "39",
  US: "1", CA: "1", AU: "61",
};

/**
 * "+252 61-234 5678" / "00252…" → "252612345678". A local number ("061…", "61…") gets the calling code of the
 * country the visitor signs up from. "" when empty; null when it can't be read as a full international number.
 */
export function normalizeWhatsapp(raw: string, country: string): string | null {
  const s = raw.trim();
  if (!s) return "";
  if (!/^[+\d\s().-]+$/.test(s)) return null;
  const intl = s.startsWith("+") || s.replace(/[\s().-]/g, "").startsWith("00");
  let digits = s.replace(/\D/g, "").replace(/^00/, "");
  if (!intl) {
    const code = CALLING_CODES[country];
    if (code && !(digits.startsWith(code) && digits.length >= code.length + 8)) digits = code + digits.replace(/^0+/, "");
    else if (!code && digits.startsWith("0")) return null;
  }
  return /^[1-9]\d{8,14}$/.test(digits) ? digits : null;
}
