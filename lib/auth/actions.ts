"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOGIN_PATH, safeNextPath } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/env";
import { isValidTimeZone } from "@/lib/knowledge";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  notice?: string;
  fieldErrors?: { email?: string; password?: string; fullName?: string };
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function checkEmail(email: string): string | undefined {
  if (!email) return "Email is required.";
  if (email.length > 254 || !EMAIL.test(email)) return "Enter a valid email address.";
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  const fieldErrors: AuthState["fieldErrors"] = { email: checkEmail(email) };
  if (!password) fieldErrors.password = "Password is required.";
  if (fieldErrors.email || fieldErrors.password) return { fieldErrors };
  if (!isSupabaseConfigured()) return { error: "Sign-in is not configured on this server yet." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "Please confirm your email first (check your inbox)." };
    if (error.code === "over_request_rate_limit") return { error: "Too many attempts. Please wait and try again." };
    if (error.code === "invalid_credentials") return { error: "Incorrect email or password." };
    return { error: `Sign-in failed (${error.code ?? `status ${error.status ?? "unknown"}`}).` };
  }
  redirect(next);
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  // Only a name the runtime knows is passed on; the database checks it again.
  const tz = String(formData.get("timezone") ?? "").trim();
  const timezone = tz && tz.length <= 64 && isValidTimeZone(tz) ? tz : "UTC";

  const fieldErrors: AuthState["fieldErrors"] = { email: checkEmail(email) };
  if (fullName.length > 100) fieldErrors.fullName = "At most 100 characters.";
  if (password.length < MIN_PASSWORD) fieldErrors.password = `Use at least ${MIN_PASSWORD} characters.`;
  else if (password.length > 72) fieldErrors.password = "At most 72 characters.";
  if (fieldErrors.email || fieldErrors.password || fieldErrors.fullName) return { fieldErrors };
  if (!isSupabaseConfigured()) return { error: "Sign-up is not configured on this server yet." };

  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, timezone },
      emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
    },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: "An account with this email already exists. Sign in instead." };
    if (error.code === "weak_password") return { fieldErrors: { password: "That password is too weak. Try a longer one." } };
    if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
      return { error: "Too many sign-ups right now. Please wait a few minutes." };
    }
    return { error: `Sign-up failed (${error.code ?? `status ${error.status ?? "unknown"}`}).` };
  }
  // Email confirmation on: no session yet.
  if (!data.session) return { notice: `Check ${email} for a confirmation link, then sign in.` };
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(LOGIN_PATH);
}
