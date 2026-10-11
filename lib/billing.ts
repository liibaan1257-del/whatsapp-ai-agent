/**
 * Plans and access (manual billing: the customer pays the operator, who then
 * extends access on the Admin page). Safe on server and client.
 */
export const PLANS = {
  trial: { replies: 200 },
  starter: { replies: 500 },
  pro: { replies: 2000 },
} as const;
export type Plan = keyof typeof PLANS;
export const PLAN_NAMES = Object.keys(PLANS) as Plan[];

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && value in PLANS;
}

/** AI replies allowed per calendar month (UTC) on a plan. */
export function replyLimit(plan: string): number {
  return isPlan(plan) ? PLANS[plan].replies : PLANS.trial.replies;
}

/** Start of the current calendar month, UTC. */
export function monthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Days of access left, rounded up (14 right after sign-up, 1 on the last day, -1 once ended). */
export function daysLeft(accessUntil: string | Date, now: Date = new Date()): number {
  const ms = new Date(accessUntil).getTime() - now.getTime();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : -1;
}

export function isActive(accessUntil: string | Date, now: Date = new Date()): boolean {
  return new Date(accessUntil).getTime() > now.getTime();
}

/** wa.me link to the operator with a ready-made message, or null if no number is set. */
export function contactWhatsappLink(text: string): string | null {
  const digits = (process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "").replace(/[\s()+-]/g, "");
  if (!/^[1-9][0-9]{6,14}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
