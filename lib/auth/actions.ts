"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { LOGIN_PATH, safeNextPath } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/env";
import { fmt } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/dictionaries";
import { requestLocale, requestMessages } from "@/lib/i18n/server";
import { isValidTimeZone } from "@/lib/knowledge";
import { notifyOperator, sendWelcome } from "@/lib/notify";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  notice?: string;
  fieldErrors?: { email?: string; password?: string; fullName?: string };
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function checkEmail(email: string, m: Messages): string | undefined {
  if (!email) return m.auth.errors.emailRequired;
  if (email.length > 254 || !EMAIL.test(email)) return m.auth.errors.emailInvalid;
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const m = await requestMessages();
  const e = m.auth.errors;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  const fieldErrors: AuthState["fieldErrors"] = { email: checkEmail(email, m) };
  if (!password) fieldErrors.password = e.passwordRequired;
  if (fieldErrors.email || fieldErrors.password) return { fieldErrors };
  if (!isSupabaseConfigured()) return { error: e.signInNotConfigured };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") return { error: e.emailNotConfirmed };
    if (error.code === "over_request_rate_limit") return { error: e.tooManyAttempts };
    if (error.code === "invalid_credentials") return { error: e.invalidCredentials };
    return { error: fmt(e.signInFailed, { code: error.code ?? `status ${error.status ?? "unknown"}` }) };
  }
  redirect(next);
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const m = await requestMessages();
  const e = m.auth.errors;
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  // Only a name the runtime knows is passed on; the database checks it again.
  const tz = String(formData.get("timezone") ?? "").trim();
  const timezone = tz && tz.length <= 64 && isValidTimeZone(tz) ? tz : "UTC";

  const fieldErrors: AuthState["fieldErrors"] = { email: checkEmail(email, m) };
  if (fullName.length > 100) fieldErrors.fullName = e.nameTooLong;
  if (password.length < MIN_PASSWORD) fieldErrors.password = fmt(e.passwordShort, { min: MIN_PASSWORD });
  else if (password.length > 72) fieldErrors.password = e.passwordLong;
  if (fieldErrors.email || fieldErrors.password || fieldErrors.fullName) return { fieldErrors };
  if (!isSupabaseConfigured()) return { error: e.signUpNotConfigured };

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
    if (error.code === "user_already_exists") return { error: e.userExists };
    if (error.code === "weak_password") return { fieldErrors: { password: e.weakPassword } };
    if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
      return { error: e.tooManySignups };
    }
    return { error: fmt(e.signUpFailed, { code: error.code ?? `status ${error.status ?? "unknown"}` }) };
  }
  // Supabase answers an already-registered email with a user that has no
  // identities and sends no email (it hides which emails exist): say so.
  if (data.user && data.user.identities?.length === 0) return { error: e.userExists };
  // Tell the operator and welcome the new owner, after the response is sent.
  const who = fullName.replace(/\s+/g, " ") || email;
  const locale = await requestLocale();
  after(() =>
    Promise.all([
      notifyOperator(
        `New ReplyBooker signup: ${who}`,
        `${who} (${email}) just signed up.\nTime zone: ${timezone}\n\nSee all customers: ${siteUrl()}/dashboard/admin`,
      ),
      sendWelcome(email, fullName.replace(/\s+/g, " "), locale),
    ]),
  );
  // Email confirmation on: no session yet.
  if (!data.session) return { notice: fmt(m.auth.checkEmail, { email }) };
  redirect("/dashboard");
}

/**
 * "Forgot password": emails a reset link. Always gives the same answer so the
 * form can't be used to find out which emails have accounts.
 */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const m = await requestMessages();
  const e = m.auth.errors;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const emailError = checkEmail(email, m);
  if (emailError) return { fieldErrors: { email: emailError } };
  if (!isSupabaseConfigured()) return { error: e.signInNotConfigured };

  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { error: e.tooManyAttempts };
  }
  return { notice: fmt(m.auth.resetSent, { email }) };
}

/** Sets a new password for the user signed in through a reset link. */
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const m = await requestMessages();
  const e = m.auth.errors;
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  if (password.length < MIN_PASSWORD) return { fieldErrors: { password: fmt(e.passwordShort, { min: MIN_PASSWORD }) } };
  if (password.length > 72) return { fieldErrors: { password: e.passwordLong } };
  if (password !== repeat) return { fieldErrors: { password: e.passwordsDiffer } };
  if (!isSupabaseConfigured()) return { error: e.signInNotConfigured };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { error: e.linkExpired };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: e.samePassword } };
    if (error.code === "weak_password") return { fieldErrors: { password: e.weakPassword } };
    return { error: fmt(e.resetFailed, { code: error.code ?? `status ${error.status ?? "unknown"}` }) };
  }
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(LOGIN_PATH);
}
