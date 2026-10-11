import { connection, type NextRequest } from "next/server";
import { handleCustomerMessage } from "@/lib/agent/engine";
import { getOwner } from "@/lib/auth/session";
import { testPhoneFor } from "@/lib/dashboard/chat-test";
import { checkServiceRoleKey } from "@/lib/diagnostics";
import { configStatus } from "@/lib/env";
import { fmt } from "@/lib/i18n/config";
import { requestMessages } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

const MAX_CHARS = 4000;

const NOT_REPLIED = {
  ai_disabled: { status: 409, key: "aiDisabled" },
  ai_not_configured: { status: 503, key: "aiNotConfigured" },
  rate_limited: { status: 429, key: "rateLimited" },
  duplicate: { status: 409, key: "duplicate" },
} as const;

/**
 * POST /api/chat-test — the dashboard's chat tester.
 * Runs the same engine as WhatsApp for the signed-in owner's own business,
 * on a separate "test" channel. Body: { message: string }.
 */
export async function POST(request: NextRequest) {
  await connection();
  // Errors are shown to the owner in the dashboard language.
  const m = await requestMessages();
  const e = m.chat.errors;
  // Cookie-authenticated: refuse cross-site requests.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return Response.json({ error: e.crossSite }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: e.contentType }, { status: 415 });
  }

  const owner = await getOwner();
  if (!owner) return Response.json({ error: e.signIn }, { status: 401 });

  let body: { message?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: e.invalidJson }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return Response.json({ error: e.empty }, { status: 400 });
  if (message.length > MAX_CHARS) return Response.json({ error: fmt(e.tooLong, { max: MAX_CHARS }) }, { status: 400 });

  // Say exactly which server setting is missing instead of a generic error.
  const config = configStatus();
  if (!config.serviceRole) {
    return Response.json(
      { error: e.setupServiceKey },
      { status: 503 },
    );
  }
  if (!config.ai) {
    return Response.json({ error: e.setupAi }, { status: 503 });
  }

  try {
    // businessId comes from the session, never from the request body.
    const result = await handleCustomerMessage({
      businessId: owner.businessId,
      channel: "test",
      customerPhone: testPhoneFor(owner.id),
      customerName: null,
      text: message,
    });
    if (result.status === "replied") {
      return Response.json({ reply: result.reply, intent: result.intent, bookingId: result.bookingId });
    }
    if (result.status === "error") {
      // A database error usually means the wrong secret key: say which problem it is.
      if (result.code === "db_error") {
        const key = await checkServiceRoleKey();
        if (key !== "ok") return Response.json({ error: fmt(e.setupProblem, { detail: m.chat.serviceKey[key] }) }, { status: 503 });
      }
      return Response.json({ error: fmt(e.aiFailed, { code: result.code }) }, { status: 502 });
    }
    const info = NOT_REPLIED[result.status];
    return Response.json({ error: e[info.key] }, { status: info.status });
  } catch (error) {
    logger.error("chat_test_failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: e.generic }, { status: 500 });
  }
}
