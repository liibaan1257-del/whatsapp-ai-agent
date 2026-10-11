/** Display helpers (safe on server and client). */

/** Short date and time in the business's time zone, written in the dashboard language. */
export function formatDateTime(iso: string, timeZone: string, timeFormat: "12h" | "24h" = "24h", locale = "en"): string {
  const tag = locale === "en" ? (timeFormat === "12h" ? "en-US" : "en-GB") : locale;
  return new Intl.DateTimeFormat(tag, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: timeFormat === "12h" ? "numeric" : "2-digit",
    minute: "2-digit",
    ...(timeFormat === "12h" ? { hour12: true } : { hourCycle: "h23" as const }),
  }).format(new Date(iso));
}

/** "5 min ago" / "hace 5 min" relative to `now`, in the dashboard language. */
export function timeAgo(iso: string, locale = "en", now: Date = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  if (s < 60) return rtf.format(0, "second");
  if (s < 3600) return rtf.format(-Math.floor(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.floor(s / 3600), "hour");
  return rtf.format(-Math.floor(s / 86400), "day");
}

export const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  confirmed: "bg-brand/15 text-brand",
  cancelled: "bg-destructive/10 text-destructive",
  completed: "bg-secondary text-secondary-foreground",
};

/** "$15.00" for a number in a currency; the text as-is when it isn't a plain number. */
export function formatPrice(price: string, currency: string): string {
  // Only a plain number ("15", "15.50", "15,50") gets the currency; anything the
  // owner typed with a symbol or words ("€15", "from 20") is shown as written.
  const m = /^\s*(\d{1,9})(?:[.,](\d{1,2}))?\s*$/.exec(price);
  if (!m) return price;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(Number(`${m[1]}.${m[2] ?? "0"}`));
  } catch {
    return price;
  }
}
