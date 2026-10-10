import { DAY_LABELS, DAYS, type Knowledge } from "@/lib/knowledge";

/** The business-specific part of the system prompt. */
export function describeBusiness(k: Knowledge): string {
  const lines: string[] = [];
  lines.push(`Business name: ${k.business_name || "(not set)"}`);
  if (k.description) lines.push(`About: ${k.description}`);
  lines.push(`Time zone: ${k.timezone}`);

  lines.push("", "Services:");
  if (k.services.length === 0) lines.push("- (none listed yet: tell customers the team will share details)");
  for (const s of k.services) {
    const bits = [s.price && `price ${s.price}`, `${s.duration_minutes} min`].filter(Boolean).join(", ");
    lines.push(`- ${s.name} (${bits})${s.description ? `: ${s.description}` : ""}`);
  }

  lines.push("", "Opening hours:");
  for (const day of DAYS) {
    const h = k.working_hours[day];
    lines.push(`- ${DAY_LABELS[day]}: ${h ? `${h.open}–${h.close}` : "closed"}`);
  }

  if (k.booking_policy) lines.push("", `Booking policy: ${k.booking_policy}`);

  if (k.faqs.length) {
    lines.push("", "FAQs:");
    for (const f of k.faqs) lines.push(`Q: ${f.question}`, `A: ${f.answer}`);
  }
  return lines.join("\n");
}
