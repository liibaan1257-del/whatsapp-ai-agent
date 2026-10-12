import { connection, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendDueReminders } from "@/lib/reminders";
import { safeEqual } from "@/lib/whatsapp/meta";

export const maxDuration = 60;

/**
 * GET /api/cron/reminders — run daily by Vercel Cron (vercel.json).
 * Vercel sends "Authorization: Bearer <CRON_SECRET>"; anything else is refused.
 */
export async function GET(request: NextRequest) {
  await connection();
  const secret = serverEnv.cronSecret();
  if (!secret) {
    logger.error("missing_config", { variable: "CRON_SECRET" });
    return Response.json({ error: "not_configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${secret}`)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const summary = await sendDueReminders();
  return Response.json(summary);
}
