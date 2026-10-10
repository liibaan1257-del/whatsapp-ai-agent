import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, publicEnv, serverEnv } from "@/lib/env";

/**
 * Service-role client: bypasses Row Level Security. Server-only, and used
 * only where there is no signed-in owner (the WhatsApp webhook) or after the
 * code has already checked which business the data belongs to.
 * The `server-only` import makes the build fail if a client component imports it.
 */
export function createAdminClient() {
  const key = serverEnv.supabaseServiceRoleKey();
  if (!isSupabaseConfigured() || !key) {
    throw new Error("Supabase admin access is not configured: set SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(publicEnv.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
