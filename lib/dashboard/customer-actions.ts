"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { getOwner } from "@/lib/auth/session";
import { fmt } from "@/lib/i18n/config";
import { requestMessages } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { normalizeWhatsapp } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LINES = 500;

export type CustomerState = { ok?: boolean; notice?: string; error?: string };

/** "Cali Axmed, 0612345678" / "Cali Axmed 061 234 5678" / "Cali: +252…" → name and raw number. */
function splitLine(line: string): { name: string; phone: string } | null {
  const m = line.trim().match(/^(.*?)[\s,;:\t|-]+(\+?[\d][\d\s().-]{5,})$/);
  if (!m) return null;
  const name = m[1].replace(/\s+/g, " ").trim().slice(0, 100);
  return name ? { name, phone: m[2] } : null;
}

/** Add one customer (name + phone) or many (one "name, number" per line). Existing numbers are skipped. */
export async function addCustomers(_prev: CustomerState, formData: FormData): Promise<CustomerState> {
  const m = await requestMessages();
  const t = m.debts;
  const owner = await getOwner();
  if (!owner) return { error: m.common.signInAgain };

  const country = ((await headers()).get("x-vercel-ip-country") ?? "").toUpperCase();
  const bulk = String(formData.get("lines") ?? "");
  const raw = bulk
    ? bulk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    : [`${String(formData.get("name") ?? "").trim()}, ${String(formData.get("phone") ?? "").trim()}`];
  if (raw.length > MAX_LINES) return { error: fmt(t.errors.customersTooMany, { max: MAX_LINES }) };

  const rows = new Map<string, { business_id: string; name: string; phone_number: string }>();
  let bad = 0;
  for (const line of raw) {
    const parts = splitLine(line);
    const phone = parts ? normalizeWhatsapp(parts.phone.slice(0, 40), country) : null;
    if (!parts || !phone) {
      bad++;
      continue;
    }
    rows.set(phone, { business_id: owner.businessId, name: parts.name, phone_number: phone });
  }
  if (!rows.size) return { error: t.errors.customers };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").upsert([...rows.values()], { onConflict: "business_id,phone_number", ignoreDuplicates: true });
  if (error) {
    logger.error("customers_add_failed", { ownerId: owner.id, code: error.code });
    return { error: t.errors.failed };
  }
  refresh();
  return { ok: true, notice: fmt(bad ? t.customersAddedSkipped : t.customersAdded, { count: rows.size, bad }) };
}

export async function deleteCustomer(formData: FormData): Promise<void> {
  const owner = await getOwner();
  if (!owner) return;
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const { error } = await (await createClient()).from("customers").delete().eq("id", id);
  if (error) logger.error("customer_delete_failed", { ownerId: owner.id, code: error.code });
  refresh();
}
