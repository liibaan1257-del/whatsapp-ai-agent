import { connection } from "next/server";
import { checkServiceRoleKey, SERVICE_KEY_HELP } from "@/lib/diagnostics";
import { configStatus } from "@/lib/env";

/**
 * GET /api/health — setup status for troubleshooting. Names and key types
 * only; never secret values.
 */
export async function GET() {
  await connection();
  const config = configStatus();
  const serviceKey = await checkServiceRoleKey();
  return Response.json(
    {
      status: "ok",
      time: new Date().toISOString(),
      supabase: config.supabase ? "ok" : "missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
      serviceRoleKey: SERVICE_KEY_HELP[serviceKey],
      anthropicKey: config.ai ? "set" : "missing ANTHROPIC_API_KEY",
      whatsappWebhook: config.whatsappWebhook ? "set" : "missing WHATSAPP_VERIFY_TOKEN / WHATSAPP_APP_SECRET",
      whatsappSend: config.whatsappSend ? "set" : "missing WHATSAPP_ACCESS_TOKEN",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
