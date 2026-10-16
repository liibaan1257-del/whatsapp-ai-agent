import { contactWhatsapp } from "@/lib/contact";

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
/** Monthly price in USD shown on the home page (payment itself is manual). */
export const PRICES_USD: Record<Plan, number> = { trial: 0, starter: 19, pro: 49 };
/** Yearly price in USD: two months free. */
export const YEARLY_PRICES_USD: Record<Plan, number> = { trial: 0, starter: 190, pro: 490 };
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

/** Signed up in the last `days` days (the Admin page's "New" badge). */
export function isNewSignup(createdAt: string | Date, days = 7, now: Date = new Date()): boolean {
  return now.getTime() - new Date(createdAt).getTime() < days * 24 * 60 * 60 * 1000;
}

/** wa.me link to the operator with a ready-made message, or null if no number is set. */
export function contactWhatsappLink(text: string): string | null {
  const contact = contactWhatsapp();
  return contact ? `${contact.link}?text=${encodeURIComponent(text)}` : null;
}
