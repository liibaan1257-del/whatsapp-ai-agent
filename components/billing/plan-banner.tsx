import { ContactButton } from "@/components/billing/contact-button";
import { daysLeft } from "@/lib/billing";
import { fmt } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

/** Top-of-dashboard notice: trial days left, plan ending soon, or access ended. */
export function PlanBanner({ m, plan, accessUntil, email }: { m: Messages; plan: string; accessUntil: string; email: string | null }) {
  const days = daysLeft(accessUntil);
  const b = m.billing;
  let text: string | null = null;
  if (days < 0) text = b.expired;
  else if (plan === "trial") text = days <= 1 ? b.trialLastDay : fmt(b.trialLeft, { days });
  else if (days <= 3) text = fmt(b.expiresSoon, { days });
  if (!text) return null;
  const ended = days < 0;
  return (
    <div
      role={ended ? "alert" : "status"}
      className={cn(
        "mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
        ended ? "border-destructive/40 bg-destructive/10" : "border-brand/30 bg-brand/10",
      )}
    >
      <p className={ended ? "font-medium text-destructive" : ""}>{text}</p>
      <ContactButton m={m} email={email} />
    </div>
  );
}
