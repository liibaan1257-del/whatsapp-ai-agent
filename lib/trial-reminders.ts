import "server-only";
import { contactWhatsappLink, daysLeft, PRICES_USD, YEARLY_PRICES_USD } from "@/lib/billing";
import { contactEmail } from "@/lib/contact";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/notify";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

const DAY = 86_400_000;

/**
 * Emails owners whose free trial ends in 2–3 days, so they can pay before it
 * stops. Run once a day (the reminders cron): each trial falls in the window once.
 */
export async function sendTrialEndingEmails(now: Date = new Date()): Promise<{ trialEnding: number }> {
  const db = createAdminClient();
  const { data: trials, error } = await db
    .from("business_knowledge")
    .select("owner_id, business_name, access_until")
    .eq("plan", "trial")
    .gte("access_until", new Date(now.getTime() + 2 * DAY).toISOString())
    .lt("access_until", new Date(now.getTime() + 3 * DAY).toISOString());
  if (error) {
    logger.error("trial_ending_query_failed", { code: error.code });
    return { trialEnding: 0 };
  }
  if (!trials?.length) return { trialEnding: 0 };

  const { data: profiles } = await db.from("profiles").select("id, email, full_name").in("id", trials.map((t) => t.owner_id));
  const site = siteUrl();
  let sent = 0;
  for (const t of trials) {
    const p = profiles?.find((x) => x.id === t.owner_id);
    if (!p?.email) continue;
    const days = daysLeft(t.access_until, now);
    const name = (p.full_name ?? "").split(" ")[0];
    const pay = contactWhatsappLink(`Hello, I want to pay for ReplyBooker. My account: ${p.email}`);
    await sendEmail({
      to: p.email,
      replyTo: contactEmail(),
      subject: `Your ReplyBooker trial ends in ${days} days / Tijaabadaadu waxay dhammaanaysaa ${days} maalmood kadib`,
      text: [
        `Hi${name ? ` ${name}` : ""},`,
        "",
        `Your free trial${t.business_name ? ` for ${t.business_name}` : ""} ends in ${days} days. To keep your AI assistant answering customers, choose a plan:`,
        `• Starter — $${PRICES_USD.starter}/month or $${YEARLY_PRICES_USD.starter}/year (500 AI replies)`,
        `• Pro — $${PRICES_USD.pro}/month or $${YEARLY_PRICES_USD.pro}/year (2,000 AI replies)`,
        `Pay by Mobile Money, Waafi, card or bank transfer${pay ? `: ${pay}` : " — just reply to this email."}`,
        "",
        "---",
        "",
        `Salaan${name ? ` ${name}` : ""},`,
        "",
        `Tijaabadaada bilaashka ahi waxay dhammaanaysaa ${days} maalmood kadib. Si AI-gaagu u sii wado jawaabaha macaamiisha, dooro qorshe:`,
        `• Starter — $${PRICES_USD.starter} bishii ama $${YEARLY_PRICES_USD.starter} sannadkii (500 jawaab)`,
        `• Pro — $${PRICES_USD.pro} bishii ama $${YEARLY_PRICES_USD.pro} sannadkii (2,000 jawaab)`,
        `Ku bixi Mobile Money, Waafi, kaar ama bank${pay ? `: ${pay}` : " — kaliya email-kan ka jawaab."}`,
        "",
        `${site}/dashboard/settings`,
        "",
        "Liibaan — ReplyBooker",
      ].join("\n"),
    });
    sent++;
  }
  return { trialEnding: sent };
}
