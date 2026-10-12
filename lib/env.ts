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

/**
 * The Supabase secret key out of whatever was pasted: tolerates a "NAME="
 * prefix, a stray leading "_", quotes, spaces and line breaks around a real
 * sb_secret_… or JWT key. Anything else is returned as-is (and reported by
 * /api/health as malformed).
 */
export function extractServiceKey(raw: string | undefined): string {
  const value = clean(raw);
  const secret = /sb_secret_[A-Za-z0-9_-]{20,}/.exec(value);
  if (secret) return secret[0];
  const jwt = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.exec(value);
  if (jwt) return jwt[0];
  return value;
}

/** The Anthropic key out of whatever was pasted (same tolerance as the Supabase key). */
export function extractAnthropicKey(raw: string | undefined): string {
  const value = clean(raw);
  const key = /sk-ant-[A-Za-z0-9_-]{20,}/.exec(value);
  return key ? key[0] : value;
}

/** Server-only secrets, read lazily so a missing one fails only the feature that needs it. */
export const serverEnv = {
  supabaseServiceRoleKey: () => extractServiceKey(process.env.SUPABASE_SERVICE_ROLE_KEY),
  anthropicApiKey: () => extractAnthropicKey(process.env.ANTHROPIC_API_KEY),
  whatsappVerifyToken: () => clean(process.env.WHATSAPP_VERIFY_TOKEN),
  whatsappAppSecret: () => clean(process.env.WHATSAPP_APP_SECRET),
  whatsappAccessToken: () => clean(process.env.WHATSAPP_ACCESS_TOKEN),
  whatsappGraphVersion: () => clean(process.env.WHATSAPP_GRAPH_VERSION) || "v23.0",
  // Twilio (optional second WhatsApp provider).
  twilioAccountSid: () => clean(process.env.TWILIO_ACCOUNT_SID),
  twilioAuthToken: () => clean(process.env.TWILIO_AUTH_TOKEN),
  // Vercel Cron sends it as "Authorization: Bearer <CRON_SECRET>".
  cronSecret: () => clean(process.env.CRON_SECRET),
};

/** Which server-side features are configured (names only, never values). */
export function configStatus() {
  return {
    supabase: isSupabaseConfigured(),
    serviceRole: Boolean(serverEnv.supabaseServiceRoleKey()),
    ai: Boolean(serverEnv.anthropicApiKey()),
    whatsappWebhook: Boolean(serverEnv.whatsappVerifyToken() && serverEnv.whatsappAppSecret()),
    whatsappSend: Boolean(serverEnv.whatsappAccessToken()),
    twilio: Boolean(serverEnv.twilioAccountSid() && serverEnv.twilioAuthToken()),
  };
}
