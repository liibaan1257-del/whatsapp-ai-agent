/**
 * Environment configuration.
 *
 * NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so
 * only public values go there. Everything in `serverEnv` is read on the
 * server at request time and must never be imported into client components.
 */

/** Trims whitespace and stray quotes pasted into dashboards. */
function clean(value: string | undefined): string {
  return (value ?? "").trim().replace(/^[`"']+|[`"']+$/g, "").trim();
}

/** Public values (referenced literally so Next.js can inline them). */
export const publicEnv = {
  supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, ""),
  supabaseAnonKey:
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
} as const;

export function isSupabaseConfigured(): boolean {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) return false;
  try {
    return ["http:", "https:"].includes(new URL(publicEnv.supabaseUrl).protocol);
  } catch {
    return false;
  }
}

/** Server-only secrets, read lazily so a missing one fails only the feature that needs it. */
export const serverEnv = {
  supabaseServiceRoleKey: () => clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  anthropicApiKey: () => clean(process.env.ANTHROPIC_API_KEY),
  whatsappVerifyToken: () => clean(process.env.WHATSAPP_VERIFY_TOKEN),
  whatsappAppSecret: () => clean(process.env.WHATSAPP_APP_SECRET),
  whatsappAccessToken: () => clean(process.env.WHATSAPP_ACCESS_TOKEN),
  whatsappGraphVersion: () => clean(process.env.WHATSAPP_GRAPH_VERSION) || "v23.0",
};

/** Which server-side features are configured (names only, never values). */
export function configStatus() {
  return {
    supabase: isSupabaseConfigured(),
    serviceRole: Boolean(serverEnv.supabaseServiceRoleKey()),
    ai: Boolean(serverEnv.anthropicApiKey()),
    whatsappWebhook: Boolean(serverEnv.whatsappVerifyToken() && serverEnv.whatsappAppSecret()),
    whatsappSend: Boolean(serverEnv.whatsappAccessToken()),
  };
}
