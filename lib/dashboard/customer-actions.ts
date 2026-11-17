"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { getOwner } from "@/lib/auth/session";
import { isPaid } from "@/lib/billing";
import { fmt } from "@/lib/i18n/config";
import { requestMessages } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { normalizeWhatsapp } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LINES = 500;

export type CustomerState = { ok?: boolean; notice?: string; error?: string };

/** One "name number" pair: a name without digits, then a number (6+ digits, spaces/dashes allowed). */
const PAIR = /([^\d\n,;:|]+?)[\s,;:|-]+(\+?\d[\d\s().-]{4,}\d)/g;

/** All name/number pairs in the text, several per line allowed ("Cali, 061… Hodan 063…"). */
function pairs(text: string): { name: string; phone: string }[] {
  return [...text.matchAll(PAIR)]
    .map((m) => ({ name: m[1].replace(/\s+/g, " ").replace(/^[\s,;:|-]+|[\s,;:|-]+$/g, "").slice(0, 100), phone: m[2] }))
    .filter((p) => p.name);
}

/** Add one customer (name + phone) or many (one "name, number" per line). Existing numbers are skipped. */
export async function addCustomers(_prev: CustomerState, formData: FormData): Promise<CustomerState> {
  const m = await requestMessages();
  const t = m.debts;
  const owner = await getOwner();
  if (!owner) return { error: m.common.signInAgain };
  if (!isPaid(owner.plan, owner.accessUntil)) return { error: t.lockedBody };

  const country = ((await headers()).get("x-vercel-ip-country") ?? "").toUpperCase();
  const text = String(formData.get("lines") ?? "").slice(0, 50_000);
  const found = pairs(text);
  if (found.length > MAX_LINES) return { error: fmt(t.errors.customersTooMany, { max: MAX_LINES }) };

  const rows = new Map<string, { business_id: string; name: string; phone_number: string }>();
  let bad = 0;
  for (const p of found) {
    const phone = normalizeWhatsapp(p.phone.slice(0, 40), country);
    if (!phone) {
      bad++;
      continue;
    }
    rows.set(phone, { business_id: owner.businessId, name: p.name, phone_number: phone });
  }
  // Lines with no number at all are skipped too.
  bad += text.split(/\r?\n/).filter((l) => l.trim() && !/\d{5}/.test(l.replace(/[\s().-]/g, ""))).length;
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
