import "server-only";
import { cacheLife } from "next/cache";
import { configStatus } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * How many businesses have signed up, rounded DOWN to a clean ten for a
 * social-proof line ("40+ businesses"). It never overstates — it shows the
 * floor of the real count — and returns 0 while the number is still too small
 * to be worth showing, or when the service role isn't configured. Cached for
 * an hour so the landing pages don't query on every visit.
 */
export async function getBusinessCountFloor(): Promise<number> {
  "use cache";
  cacheLife("hours");
  if (!configStatus().serviceRole) return 0;
  const { count, error } = await createAdminClient()
    .from("business_knowledge")
    .select("id", { count: "exact", head: true });
  if (error || !count || count < 30) return 0;
  return Math.floor(count / 10) * 10;
}
