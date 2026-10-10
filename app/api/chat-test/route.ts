import { connection, type NextRequest } from "next/server";
import { handleCustomerMessage } from "@/lib/agent/engine";
import { getOwner } from "@/lib/auth/session";
import { testPhoneFor } from "@/lib/dashboard/chat-test";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

const MAX_CHARS = 4000;

const NOT_REPLIED: Record<string, { status: number; message: string }> = {
  ai_disabled: { status: 409, message: "AI replies are turned off. Turn them on in the Knowledge base." },
  ai_not_configured: { status: 503, message: "The AI isn't set up yet: add ANTHROPIC_API_KEY in Vercel and redeploy." },
  rate_limited: { status: 429, message: "Too many test messages in 10 minutes. Wait a bit or reset the conversation." },
  duplicate: { status: 409, message: "Duplicate message." },
};

/**
 * POST /api/chat-test — the dashboard's chat tester.
 * Runs the same engine as WhatsApp for the signed-in owner's own business,
 * on a separate "test" channel. Body: { message: string }.
 */
export async function POST(request: NextRequest) {
  await connection();
  // Cookie-authenticated: refuse cross-site requests.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return Response.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  const owner = await getOwner();
  if (!owner) return Response.json({ error: "Please sign in." }, { status: 401 });

  let body: { message?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return Response.json({ error: "Type a message first." }, { status: 400 });
  if (message.length > MAX_CHARS) return Response.json({ error: `At most ${MAX_CHARS} characters.` }, { status: 400 });

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
      return Response.json({ error: `The AI couldn't answer (${result.code}). Please try again.` }, { status: 502 });
    }
    const info = NOT_REPLIED[result.status];
    return Response.json({ error: info.message }, { status: info.status });
  } catch (error) {
    logger.error("chat_test_failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
