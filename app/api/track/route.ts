import type { NextRequest } from "next/server";
import { isPrivatePath } from "@/lib/analytics";
import { configStatus } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp/i;
const PATH = /^\/[a-z0-9\-/]{0,199}$/;
const SESSION = /^[a-z0-9]{8,32}$/;
const SOURCE = /^[a-z0-9_.\-]{1,60}$/;

function deviceOf(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

function hostOf(raw: unknown, ownHost: string): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "").slice(0, 100);
    return host && host !== ownHost.replace(/^www\./, "") ? host : null;
  } catch {
    return null;
  }
}

/**
 * POST /api/track — one page view of a public page, sent by the browser with
 * navigator.sendBeacon. Stores no IP, user agent or cookie (see the migration).
 * Always answers 204 so it never shows errors to visitors.
 */
export async function POST(request: NextRequest) {
  const done = new Response(null, { status: 204 });
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return done;
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua) || !configStatus().serviceRole) return done;

  const text = await request.text();
  if (text.length > 2000) return done;
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return done;
  }
  const path = typeof body.path === "string" ? body.path.toLowerCase() : "";
  if (!PATH.test(path) || isPrivatePath(path)) return done;
  const session = typeof body.session === "string" && SESSION.test(body.session) ? body.session : null;
  const utm = typeof body.utm === "string" ? body.utm.toLowerCase().slice(0, 60) : "";
  const country = (request.headers.get("x-vercel-ip-country") ?? "").toUpperCase();

  const { error } = await createAdminClient()
    .from("page_views")
    .insert({
      path,
      referrer_host: hostOf(body.referrer, request.nextUrl.hostname),
      utm_source: SOURCE.test(utm) ? utm : null,
      country: /^[A-Z]{2}$/.test(country) ? country : null,
      device: deviceOf(ua),
      session_id: session,
    });
  if (error) logger.warn("page_view_insert_failed", { error: error.message });
  return done;
}
