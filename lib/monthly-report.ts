import "server-only";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/notify";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * On the 1st of each month: email every active business what its AI agent did
 * last month (AI replies, customers, bookings). Skips businesses with no replies.
 * Each business is claimed with a conditional update first, so a re-run sends nothing twice.
 */
export async function sendMonthlyReports(now: Date = new Date()): Promise<{ monthlyReports: number }> {
  if (now.getUTCDate() !== 1) return { monthlyReports: 0 };
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const period = start.toISOString().slice(0, 7);
  const monthEn = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(start);
  const db = createAdminClient();

  const { data: businesses, error } = await db
    .from("business_knowledge")
    .select("id, owner_id, business_name, monthly_report_for")
    .gt("access_until", now.toISOString())
    .or(`monthly_report_for.is.null,monthly_report_for.neq.${period}`);
  if (error) {
    logger.error("monthly_report_query_failed", { code: error.code });
    return { monthlyReports: 0 };
  }

  let sent = 0;
  for (const b of businesses ?? []) {
    const [replies, conversations, bookings] = await Promise.all([
      db.from("messages").select("id", { count: "exact", head: true }).eq("business_id", b.id).eq("role", "assistant").gte("created_at", start.toISOString()).lt("created_at", end.toISOString()),
      db.from("conversations").select("id", { count: "exact", head: true }).eq("business_id", b.id).eq("channel", "whatsapp").gte("last_message_at", start.toISOString()).lt("created_at", end.toISOString()),
      db.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", b.id).eq("source", "ai").gte("created_at", start.toISOString()).lt("created_at", end.toISOString()),
    ]);
    const r = replies.count ?? 0, c = conversations.count ?? 0, k = bookings.count ?? 0;
    if (r === 0) continue;

    // Claim this business for this month; another run that got here first wins.
    const { data: claimed } = await db
      .from("business_knowledge")
      .update({ monthly_report_for: period })
      .eq("id", b.id)
      .or(`monthly_report_for.is.null,monthly_report_for.neq.${period}`)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const { data: p } = await db.from("profiles").select("email, full_name").eq("id", b.owner_id).maybeSingle();
    if (!p?.email) continue;
    const name = (p.full_name ?? "").split(" ")[0];
    const biz = b.business_name || "your business";
    await sendEmail({
      to: p.email,
      subject: `${b.business_name || "ReplyBooker"}: your AI agent in ${monthEn} / Warbixinta bisha`,
      text: [
        `Hi${name ? ` ${name}` : ""},`,
        "",
        `Here is what your AI agent did for ${biz} in ${monthEn}:`,
        `• ${r} WhatsApp replies sent`,
        `• ${c} customers talked to it`,
        `• ${k} bookings taken`,
        "",
        "---",
        "",
        `Salaan${name ? ` ${name}` : ""},`,
        "",
        `Waa kan wixii AI-gaagu u qabtay ${b.business_name || "ganacsigaaga"} bishii ${period}:`,
        `• ${r} jawaab WhatsApp ah`,
        `• ${c} macmiil ayaa la hadlay`,
        `• ${k} ballan ayuu qabtay`,
        "",
        `${siteUrl()}/dashboard`,
        "",
        "Liibaan — ReplyBooker",
      ].join("\n"),
    });
    sent++;
  }
  logger.info("monthly_reports_sent", { period, sent });
  return { monthlyReports: sent };
}
