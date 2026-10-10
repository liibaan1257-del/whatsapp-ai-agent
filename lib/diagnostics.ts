import "server-only";
import { isSupabaseConfigured, publicEnv, serverEnv } from "@/lib/env";

/**
 * Setup checks that never reveal secret values: they only say what kind of
 * key is configured and whether this Supabase project accepts it.
 */

export type ServiceKeyStatus =
  | "ok"
  | "missing"
  | "is_publishable_key" // the public key was pasted instead of the secret one
  | "is_anon_key"
  | "rejected" // key from another project, or mistyped
  | "unreachable";

/** Role inside a legacy JWT key ("anon" / "service_role"), or null. */
function jwtRole(key: string): string | null {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export async function checkServiceRoleKey(): Promise<ServiceKeyStatus> {
  const key = serverEnv.supabaseServiceRoleKey();
  if (!key) return "missing";
  if (key.startsWith("sb_publishable_")) return "is_publishable_key";
  const role = jwtRole(key);
  if (role && role !== "service_role") return "is_anon_key";
  if (!isSupabaseConfigured()) return "unreachable";
  try {
    // Only a secret key can read this table without a signed-in user.
    const res = await fetch(`${publicEnv.supabaseUrl}/rest/v1/business_knowledge?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 401 || res.status === 403) return "rejected";
    return res.ok ? "ok" : "unreachable";
  } catch {
    return "unreachable";
  }
}

export const SERVICE_KEY_HELP: Record<ServiceKeyStatus, string> = {
  ok: "OK",
  missing: "SUPABASE_SERVICE_ROLE_KEY is not set in Vercel.",
  is_publishable_key: "SUPABASE_SERVICE_ROLE_KEY contains the PUBLIC key (sb_publishable_…). Use the SECRET key (sb_secret_…) from Supabase → Project Settings → API Keys.",
  is_anon_key: "SUPABASE_SERVICE_ROLE_KEY contains the anon key. Use the secret / service_role key.",
  rejected: "This Supabase project rejects SUPABASE_SERVICE_ROLE_KEY: it's probably from another project (e.g. ServiceIT). Copy the secret key from the whatsapp-ai-agent project.",
  unreachable: "Couldn't reach Supabase to check the key.",
};
