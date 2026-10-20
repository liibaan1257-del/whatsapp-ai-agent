import "server-only";
import type { Locale } from "@/lib/i18n/config";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sends the "confirm your email" link through Resend (our own domain), so it
 * lands in the inbox instead of relying on Supabase's built-in mailer.
 *
 * The link is a one-time Supabase magic link: opening it confirms the email
 * and signs the owner in. Nothing is sent for an unknown or already-confirmed
 * address. Returns whether an email went out. Never throws.
 */
export async function sendConfirmationEmail(email: string, origin: string, locale: Locale | "both"): Promise<boolean> {
  try {
    const admin = createAdminClient();
    // Only existing accounts: a magic link for an unknown address would create one.
    const { data: profile } = await admin.from("profiles").select("full_name").eq("email", email).maybeSingle();
    if (!profile) return false;

    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !data.properties?.hashed_token) {
      logger.warn("confirm_link_failed", { code: error?.code ?? "no_token" });
      return false;
    }
    if (data.user?.email_confirmed_at) return false;

    const link = `${origin}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink&next=/dashboard`;
    const first = (profile.full_name ?? "").trim().split(/\s+/)[0] ?? "";
    return await sendEmail({ to: email, ...confirmText(locale, first, link) });
  } catch (error) {
    logger.warn("confirm_email_failed", { error: String(error) });
    return false;
  }
}

function confirmText(locale: Locale | "both", first: string, link: string): { subject: string; text: string } {
  const so = {
    subject: "Xaqiiji email-kaaga – ReplyBooker",
    text: [
      `Salaan${first ? ` ${first}` : ""} 👋`,
      "",
      "Mahadsanid isdiiwaangelintaada ReplyBooker. Riix link-ga hoose si aad u xaqiijiso email-kaaga oo aad u gasho dashboard-kaaga:",
      "",
      link,
      "",
      "Link-gu wuxuu shaqeynayaa hal mar oo keliya. Haddii aadan adigu isdiiwaangelin, iska dhaaf email-kan.",
    ].join("\n"),
  };
  const en = {
    subject: "Confirm your email – ReplyBooker",
    text: [
      `Hi${first ? ` ${first}` : ""} 👋`,
      "",
      "Thanks for signing up for ReplyBooker. Open the link below to confirm your email and go to your dashboard:",
      "",
      link,
      "",
      "The link works once. If you didn't sign up, you can ignore this email.",
    ].join("\n"),
  };
  const sign = "\n\nReplyBooker";
  if (locale === "so") return { subject: so.subject, text: so.text + sign };
  if (locale === "both") return { subject: `${so.subject} / ${en.subject}`, text: `${so.text}\n\n---\n\n${en.text}${sign}` };
  return { subject: en.subject, text: en.text + sign };
}
