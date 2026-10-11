import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export type Owner = {
  id: string;
  email: string | null;
  fullName: string | null;
  businessId: string;
  businessName: string;
  plan: string;
  accessUntil: string;
  /** Operator of the whole service (profiles.is_platform_admin, set only by SQL). */
  isAdmin: boolean;
};

/**
 * The signed-in owner and their business, verified on the server (JWT via
 * getClaims, business via RLS). Never trusts ids sent by the browser.
 * Deduplicated per request.
 */
export const getOwner = cache(async (): Promise<Owner | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const [{ data: profile }, { data: business }] = await Promise.all([
    supabase.from("profiles").select("email, full_name, is_platform_admin").eq("id", userId).maybeSingle(),
    supabase.from("business_knowledge").select("id, business_name, plan, access_until").eq("owner_id", userId).maybeSingle(),
  ]);
  if (!business) return null; // Sign-up trigger not run (migration missing).

  return {
    id: userId,
    email: typeof data.claims.email === "string" ? data.claims.email : (profile?.email ?? null),
    fullName: profile?.full_name ?? null,
    businessId: business.id,
    businessName: business.business_name,
    plan: business.plan ?? "trial",
    accessUntil: business.access_until ?? new Date(0).toISOString(),
    isAdmin: profile?.is_platform_admin === true,
  };
});

/** For dashboard pages: signed-out (or no business yet) → login. */
export async function requireOwner(nextPath = "/dashboard"): Promise<Owner> {
  const owner = await getOwner();
  if (!owner) redirect(`${LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`);
  return owner;
}
