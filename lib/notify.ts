import { contactEmail } from "@/lib/contact";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

const FROM = "ReplyBooker <noreply@replybooker.com>";

/**
 * Emails the operator (NOTIFY_EMAIL, else NEXT_PUBLIC_CONTACT_EMAIL) through
 * Resend. Best effort: does nothing without RESEND_API_KEY, never throws.
 */
export async function notifyOperator(subject: string, text: string): Promise<void> {
  const key = serverEnv.resendApiKey();
  const to = (process.env.NOTIFY_EMAIL ?? "").trim() || contactEmail();
  if (!key || !to) return;

  const base = (process.env.RESEND_API_BASE ?? "https://api.resend.com").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject: subject.slice(0, 200), text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) logger.warn("notify_failed", { status: res.status });
  } catch (error) {
    logger.warn("notify_failed", { error: String(error) });
  }
}
