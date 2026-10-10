/** Display helpers (safe on server and client). */

export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
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
