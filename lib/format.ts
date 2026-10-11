/** Display helpers (safe on server and client). */

export function formatDateTime(iso: string, timeZone: string, timeFormat: "12h" | "24h" = "24h"): string {
  return new Intl.DateTimeFormat(timeFormat === "12h" ? "en-US" : "en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: timeFormat === "12h" ? "numeric" : "2-digit",
    minute: "2-digit",
    ...(timeFormat === "12h" ? { hour12: true } : { hourCycle: "h23" as const }),
  }).format(new Date(iso));
}

/** "5m ago", "3h ago", "2d ago" relative to `now`. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const INTENT_LABELS: Record<string, string> = {
  booking: "Booking",
  services: "Services",
  pricing: "Pricing",
  hours: "Hours",
  faq: "FAQ",
  greeting: "Greeting",
  other: "Other",
};

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
