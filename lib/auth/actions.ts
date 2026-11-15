"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { sendConfirmationEmail } from "@/lib/auth/confirm-email";
import { LOGIN_PATH, safeNextPath } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/env";
import { fmt } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/dictionaries";
import { requestLocale, requestMessages } from "@/lib/i18n/server";
import { isValidTimeZone } from "@/lib/knowledge";
import { logger } from "@/lib/logger";
import { notifyOperator, sendWelcome } from "@/lib/notify";
import { isReferralCode, REFERRAL_COOKIE, REFERRAL_TRIAL_DAYS } from "@/lib/referral";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  notice?: string;
  /** The password was right but the email is not confirmed yet: offer to resend the link. */
  unconfirmed?: boolean;
  fieldErrors?: { email?: string; password?: string; fullName?: string; businessName?: string; whatsapp?: string };
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Country calling codes for the places owners sign up from, keyed by the visitor's country (Vercel IP header). */
const CALLING_CODES: Record<string, string> = {
  SO: "252", ET: "251", DJ: "253", KE: "254", UG: "256", TZ: "255", YE: "967", SA: "966", AE: "971", EG: "20",
  TR: "90", GB: "44", SE: "46", NO: "47", DK: "45", FI: "358", DE: "49", NL: "31", BE: "32", FR: "33", IT: "39",
  US: "1", CA: "1", AU: "61",
};

/**
 * "+252 61-234 5678" / "00252…" → "252612345678". A local number ("061…", "61…") gets the calling code of the
 * country the visitor signs up from. "" when empty; null when it can't be read as a full international number.
 */
function normalizeWhatsapp(raw: string, country: string): string | null {
  const s = raw.trim();
  if (!s) return "";
  if (!/^[+\d\s().-]+$/.test(s)) return null;
  const intl = s.startsWith("+") || s.replace(/[\s().-]/g, "").startsWith("00");
  let digits = s.replace(/\D/g, "").replace(/^00/, "");
  if (!intl) {
    const code = CALLING_CODES[country];
    if (code && !(digits.startsWith(code) && digits.length >= code.length + 8)) digits = code + digits.replace(/^0+/, "");
    else if (!code && digits.startsWith("0")) return null;
  }
  return /^[1-9]\d{8,14}$/.test(digits) ? digits : null;
}
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
    if (error.code === "email_not_confirmed") return { error: e.emailNotConfirmed, unconfirmed: true };
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
  const businessName = String(formData.get("businessName") ?? "").replace(/\s+/g, " ").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  // Optional and never blocks signup: a number we can't read is simply not saved.
  const whatsappTyped = String(formData.get("whatsapp") ?? "").replace(/[^+\d\s().-]/g, "").trim().slice(0, 40);
  // Only a name the runtime knows is passed on; the database checks it again.
  const tz = String(formData.get("timezone") ?? "").trim();
  const timezone = tz && tz.length <= 64 && isValidTimeZone(tz) ? tz : "UTC";

  const fieldErrors: AuthState["fieldErrors"] = { email: checkEmail(email, m) };
  if (fullName.length > 100) fieldErrors.fullName = e.nameTooLong;
  if (businessName.length > 100) fieldErrors.businessName = e.nameTooLong;
  if (password.length < MIN_PASSWORD) fieldErrors.password = fmt(e.passwordShort, { min: MIN_PASSWORD });
  else if (password.length > 72) fieldErrors.password = e.passwordLong;
  if (fieldErrors.email || fieldErrors.password || fieldErrors.fullName || fieldErrors.businessName) return { fieldErrors };
  if (!isSupabaseConfigured()) return { error: e.signUpNotConfigured };

  const h = await headers();
  const whatsapp = normalizeWhatsapp(whatsappTyped, (h.get("x-vercel-ip-country") ?? "").toUpperCase()) ?? "";
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  // Created with the service role so Supabase's own mailer (limited, often
  // spam-filtered) isn't used: the confirmation link goes out through Resend.
  const admin = createAdminClient();
  // Created confirmed so the owner can sign in at once; whether they own the
  // address is tracked in profiles.email_verified_at (set by the emailed link).
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, timezone },
  });
  if (error) {
    if (error.code === "email_exists" || error.code === "user_already_exists") return { error: e.userExists };
    if (error.code === "weak_password") return { fieldErrors: { password: e.weakPassword } };
    return { error: fmt(e.signUpFailed, { code: error.code ?? `status ${error.status ?? "unknown"}` }) };
  }
  // Tell the operator and welcome the new owner, after the response is sent.
  // The database trigger created the business row; name it (server-side, by the new user's id).
  if (data.user && (businessName || whatsapp)) await setupNewBusiness(data.user.id, businessName, whatsapp || null);
  if (data.user) await applyReferral(data.user.id);
  const who = [fullName.replace(/\s+/g, " "), businessName && `(${businessName})`].filter(Boolean).join(" ") || email;
  const locale = await requestLocale();
  await sendConfirmationEmail(email, origin, locale === "so" ? "so" : "en");
  after(() =>
    Promise.all([
      notifyOperator(
        `New ReplyBooker signup: ${who}`,
        `${who} (${email}) just signed up.\nTime zone: ${timezone}${whatsapp ? `\nWhatsApp: https://wa.me/${whatsapp}` : whatsappTyped ? `\nWhatsApp (as typed, no country code): ${whatsappTyped}` : ""}\n\nSee all customers: ${siteUrl()}/dashboard/admin`,
      ),
      sendWelcome(email, fullName.replace(/\s+/g, " "), locale),
    ]),
  );
  // Straight into the dashboard; the emailed link only verifies the address.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    logger.warn("signup_sign_in_failed", { code: signInError.code ?? "unknown" });
    return { notice: fmt(m.auth.checkEmail, { email }) };
  }
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

/**
 * Sends the sign-up confirmation link again. The answer is the same whether
 * or not the email has an account, so it can't be used to find accounts.
 */
export async function resendConfirmation(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const m = await requestMessages();
  const e = m.auth.errors;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const emailError = checkEmail(email, m);
  if (emailError) return { error: emailError };
  if (!isSupabaseConfigured()) return { error: e.signInNotConfigured };

  // Only for the account's owner: the password must be right (Supabase then
  // answers "email not confirmed"), so strangers can't flood an inbox.
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "over_request_rate_limit") return { error: e.tooManyAttempts };
  if (error?.code !== "email_not_confirmed") return { error: e.invalidCredentials };

  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const locale = await requestLocale();
  const sent = await sendConfirmationEmail(email, origin, locale === "so" ? "so" : "en");
  if (!sent) logger.warn("resend_confirmation_not_sent", {});
  return { notice: fmt(m.auth.confirmationResent, { email }) };
}

/**
 * Signed-in owner: email the verification link again. Uses the session's own
 * address (never one from the form) and at most once a minute.
 */
export async function resendVerification(_prev: AuthState): Promise<AuthState> {
  const m = await requestMessages();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  if (!userId || !email) return { error: m.common.signInAgain };

  const admin = createAdminClient();
  const since = new Date(Date.now() - 60_000).toISOString();
  // Claim the send slot atomically: only one request per minute gets a row back.
  const { data: claimed } = await admin
    .from("profiles")
    .update({ verify_email_sent_at: new Date().toISOString() })
    .eq("id", userId)
    .is("email_verified_at", null)
    .or(`verify_email_sent_at.is.null,verify_email_sent_at.lt.${since}`)
    .select("id")
    .maybeSingle();
  if (!claimed) return { error: m.auth.verifyWait };

  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const locale = await requestLocale();
  const sent = await sendConfirmationEmail(email, origin, locale === "so" ? "so" : "en");
  if (!sent) logger.warn("resend_verification_not_sent", {});
  return { notice: fmt(m.auth.confirmationResent, { email }) };
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

/** Sets the business name chosen at sign-up. Best effort: the owner can always set it later. */
/**
 * Signed up through an invite link (the proxy kept ?ref=… in a cookie): link the
 * new business to the inviter and give it the longer trial. The code is looked
 * up server-side; a business can't refer itself.
 */
async function applyReferral(ownerId: string) {
  const jar = await cookies();
  const code = jar.get(REFERRAL_COOKIE)?.value;
  if (!isReferralCode(code)) return;
  jar.delete(REFERRAL_COOKIE);
  try {
    const db = createAdminClient();
    const { data: referrer } = await db.from("business_knowledge").select("id, owner_id").eq("referral_code", code).maybeSingle();
    if (!referrer || referrer.owner_id === ownerId) return;
    const { error } = await db
      .from("business_knowledge")
      .update({ referred_by: referrer.id, access_until: new Date(Date.now() + REFERRAL_TRIAL_DAYS * 86_400_000).toISOString() })
      .eq("owner_id", ownerId)
      .is("referred_by", null);
    if (error) logger.warn("signup_referral_failed", { code: error.code });
    else logger.info("signup_referral_applied", { referrerId: referrer.id });
  } catch (error) {
    logger.warn("signup_referral_failed", { error: String(error) });
  }
}

async function setupNewBusiness(ownerId: string, businessName: string, ownerWhatsapp: string | null) {
  try {
    const { error } = await createAdminClient()
      .from("business_knowledge")
      .update({ ...(businessName ? { business_name: businessName } : {}), ...(ownerWhatsapp ? { owner_whatsapp: ownerWhatsapp } : {}) })
      .eq("owner_id", ownerId);
    if (error) logger.warn("signup_business_name_failed", { code: error.code });
  } catch (error) {
    logger.warn("signup_business_name_failed", { error: String(error) });
  }
}
