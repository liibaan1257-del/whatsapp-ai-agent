import { z } from "zod";

/**
 * The business knowledge base: what the owner enters on /dashboard/knowledge
 * and what the AI reads. One schema validates both the form and the stored
 * JSON columns, so bad data can't reach the prompt.
 */

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];
export const DAY_LABELS: Record<Day, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  price: z.string().trim().max(50).default(""),
  duration_minutes: z.coerce.number().int().min(5).max(24 * 60).default(30),
  description: z.string().trim().max(500).default(""),
});

export const openingSchema = z
  .object({ open: z.string().regex(HHMM, "Use HH:MM."), close: z.string().regex(HHMM, "Use HH:MM.") })
  .refine((h) => h.open < h.close, { message: "Closing time must be after opening time." });

export const faqSchema = z.object({
  question: z.string().trim().min(1, "Question is required.").max(300),
  answer: z.string().trim().min(1, "Answer is required.").max(2000),
});

export const knowledgeSchema = z.object({
  business_name: z.string().trim().max(120).default(""),
  description: z.string().trim().max(2000).default(""),
  services: z.array(serviceSchema).max(50).default([]),
  // A day missing or null = closed.
  working_hours: z.partialRecord(z.enum(DAYS), openingSchema.nullable()).default({}),
  faqs: z.array(faqSchema).max(50).default([]),
  booking_policy: z.string().trim().max(3000).default(""),
  timezone: z.string().trim().min(1).max(64).default("UTC"),
  // ISO 4217 currency for prices, and how times are written to customers.
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code.").default("USD"),
  time_format: z.enum(["12h", "24h"]).default("24h"),
  // Meta WhatsApp "phone number ID" that routes incoming messages to this business.
  whatsapp_phone_number_id: z
    .string()
    .trim()
    .regex(/^[0-9]{5,30}$/, "Digits only (5–30), from Meta → WhatsApp → API Setup.")
    .nullable()
    .default(null),
  ai_enabled: z.boolean().default(true),
});

export type Service = z.infer<typeof serviceSchema>;
export type Opening = z.infer<typeof openingSchema>;
export type Faq = z.infer<typeof faqSchema>;
export type Knowledge = z.infer<typeof knowledgeSchema> & { id: string };
export type TimeFormat = Knowledge["time_format"];

/** Turns a business_knowledge row into a Knowledge object, dropping anything malformed. */
export function parseKnowledge(row: Record<string, unknown>): Knowledge {
  const parsed = knowledgeSchema.safeParse(row);
  if (parsed.success) return { ...parsed.data, id: String(row.id) };
  // Keep what's valid field by field rather than failing the whole agent.
  const fallback = knowledgeSchema.parse({});
  for (const key of Object.keys(fallback) as (keyof typeof fallback)[]) {
    const one = knowledgeSchema.shape[key].safeParse(row[key]);
    if (one.success) (fallback as Record<string, unknown>)[key] = one.data;
  }
  return { ...fallback, id: String(row.id) };
}

/** True when the timezone name is one the runtime knows. */
export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
