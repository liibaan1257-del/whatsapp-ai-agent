import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, safeNextPath } from "@/lib/auth/redirect";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/confirm — landing page for email confirmation links. Handles both
 * the PKCE `?code=` flow and the `?token_hash=&type=` template flow.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing_token") };

  // Our confirmation emails are one-time magic links sent to the owner's
  // address: opening one proves they own it.
  if (!error && type === "magiclink") {
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (userId) {
      await createAdminClient()
        .from("profiles")
        .update({ email_verified_at: new Date().toISOString() })
        .eq("id", userId)
        .is("email_verified_at", null);
    }
  }

  // A failed password-reset link goes back to "forgot password" to ask for a new one.
  const failedReset = error && next.startsWith("/reset-password");
  const target = new URL(error ? (failedReset ? "/forgot-password" : LOGIN_PATH) : next, url.origin);
  if (error) target.searchParams.set("error", failedReset ? "link_expired" : "confirm_failed");
  return NextResponse.redirect(target);
}
