import { contactEmail, contactWhatsapp } from "@/lib/contact";
import { serverEnv } from "@/lib/env";
import type { Locale } from "@/lib/i18n/config";
import { logger } from "@/lib/logger";
import { siteUrl } from "@/lib/site";

const FROM = "ReplyBooker <noreply@replybooker.com>";

/** Sends one plain-text email through Resend. Best effort: never throws; returns whether Resend accepted it. */
export async function sendEmail(mail: { to: string; subject: string; text: string; replyTo?: string | null }): Promise<boolean> {
  const key = serverEnv.resendApiKey();
  if (!key || !mail.to) return false;

  const base = (process.env.RESEND_API_BASE ?? "https://api.resend.com").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [mail.to],
        subject: mail.subject.slice(0, 200),
        text: mail.text,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) logger.warn("email_failed", { status: res.status });
    return res.ok;
  } catch (error) {
    logger.warn("email_failed", { error: String(error) });
    return false;
  }
}

/**
 * Sends many plain-text emails through Resend's batch endpoint (up to 100 per
 * request). Returns how many Resend accepted. Never throws.
 */
export async function sendEmailBatch(mails: { to: string; subject: string; text: string; headers?: Record<string, string> }[]): Promise<number> {
  const key = serverEnv.resendApiKey();
  if (!key) return 0;
  const base = (process.env.RESEND_API_BASE ?? "https://api.resend.com").replace(/\/+$/, "");
  let accepted = 0;
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100);
    try {
      const res = await fetch(`${base}/emails/batch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          chunk.map((m) => ({ from: FROM, to: [m.to], subject: m.subject.slice(0, 200), text: m.text, ...(m.headers ? { headers: m.headers } : {}) })),
        ),
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) accepted += chunk.length;
      else logger.warn("email_batch_failed", { status: res.status });
    } catch (error) {
      logger.warn("email_batch_failed", { error: String(error) });
    }
  }
  return accepted;
}

function operatorEmail(): string | null {
  return (process.env.NOTIFY_EMAIL ?? "").trim() || contactEmail();
}

/** Emails the operator (NOTIFY_EMAIL, else NEXT_PUBLIC_CONTACT_EMAIL). */
export async function notifyOperator(subject: string, text: string): Promise<void> {
  const to = operatorEmail();
  if (to) await sendEmail({ to, subject, text });
}

function welcomeText(locale: "so" | "en", first: string, site: string, wa: string | undefined) {
  return locale === "so"
    ? {
        subject: "Ku soo dhowoow ReplyBooker 👋",
        text: [
          `Salaan${first ? ` ${first}` : ""},`,
          "",
          "Waad ku mahadsan tahay inaad isku diiwaangelisay ReplyBooker! Waxaan ahay Liibaan, aasaasaha.",
          "",
          "Si AI-gaagu u bilaabo inuu macaamiishaada ka jawaabo, 3 tallaabo oo kaliya ayaa loo baahan yahay (5 daqiiqo):",
          `1. Knowledge base: ku qor magaca ganacsigaaga — ${site}/dashboard/knowledge`,
          "2. Ku dar adeegyadaada, qiimayaasha iyo saacadaha aad furan tahay",
          `3. Chat tester: la hadal AI-gaaga sidii macmiil oo kale — ${site}/dashboard/chat-test`,
          "",
          `Haddii aad rabto, anigaa kuu dejinaya bilaash. Kaliya email-kan iigu soo jawaab${wa ? `, ama WhatsApp iigu soo qor: ${wa}` : "."}`,
        ].join("\n"),
      }
    : {
        subject: "Welcome to ReplyBooker 👋",
        text: [
          `Hi${first ? ` ${first}` : ""},`,
          "",
          "Thanks for signing up for ReplyBooker! I'm Liibaan, the founder.",
          "",
          "To get your AI assistant answering customers, there are just 3 steps (5 minutes):",
          `1. Knowledge base: add your business name — ${site}/dashboard/knowledge`,
          "2. Add your services, prices and opening hours",
          `3. Chat tester: chat with your AI like a customer — ${site}/dashboard/chat-test`,
          "",
          `If you'd like, I'll set it up for you for free. Just reply to this email${wa ? ` or message me on WhatsApp: ${wa}` : "."}`,
        ].join("\n"),
      };
}

/**
 * Welcome email to a new owner: Somali for Somali sign-ups, English otherwise,
 * or both ("both", when the language isn't known). Replies go to the operator.
 */
export async function sendWelcome(to: string, name: string, locale: Locale | "both"): Promise<boolean> {
  const site = siteUrl();
  const wa = contactWhatsapp()?.display;
  const first = name.split(" ")[0] || "";
  const sign = "\n\nLiibaan\nReplyBooker";
  let mail: { subject: string; text: string };
  if (locale === "both") {
    const so = welcomeText("so", first, site, wa), en = welcomeText("en", first, site, wa);
    mail = { subject: `${so.subject} / ${en.subject}`, text: `${so.text}\n\n---\n\n${en.text}${sign}` };
  } else {
    const t = welcomeText(locale === "so" ? "so" : "en", first, site, wa);
    mail = { subject: t.subject, text: t.text + sign };
  }
  return sendEmail({ to, ...mail, replyTo: operatorEmail() });
}
