import { connection } from "next/server";
import { checkServiceRoleKey, describeServiceKeyShape, SERVICE_KEY_HELP } from "@/lib/diagnostics";
import { configStatus, publicEnv } from "@/lib/env";

/**
 * GET /api/health — setup status for troubleshooting. Names and key types
 * only; never secret values.
 */
export async function GET() {
  await connection();
  const config = configStatus();
  const [serviceKey, publicKey] = await Promise.all([checkServiceRoleKey(), checkPublicKey()]);
  return Response.json(
    {
      status: "ok",
      time: new Date().toISOString(),
      // Which deployment answered (Vercel sets this), to check a redeploy went live.
      version: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
      supabase: config.supabase ? "ok" : "missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
      // The project ref is part of the public URL: compare it with Supabase → Project Settings.
      supabaseProject: supabaseProjectRef(),
      supabasePublicKey: publicKey,
      serviceRoleKey: SERVICE_KEY_HELP[serviceKey],
      // Shape only (length, prefix, stray characters): never the key itself.
      serviceRoleKeyShape: describeServiceKeyShape(),
      anthropicKey: config.ai ? "set" : "missing ANTHROPIC_API_KEY",
      whatsappWebhook: config.whatsappWebhook ? "set" : "missing WHATSAPP_VERIFY_TOKEN / WHATSAPP_APP_SECRET",
      whatsappSend: config.whatsappSend ? "set" : "missing WHATSAPP_ACCESS_TOKEN",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** "abcd…" from https://abcd….supabase.co (public information). */
function supabaseProjectRef(): string | null {
  try {
    return new URL(publicEnv.supabaseUrl).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

/** Does this Supabase project accept the public (anon / publishable) key? */
async function checkPublicKey(): Promise<string> {
  if (!configStatus().supabase) return "missing";
  try {
    const res = await fetch(`${publicEnv.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publicEnv.supabaseAnonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return "OK";
    if (res.status === 401 || res.status === 403) return "rejected: the key belongs to another Supabase project";
    return `unexpected status ${res.status}`;
  } catch {
    return "Couldn't reach Supabase.";
  }
}
