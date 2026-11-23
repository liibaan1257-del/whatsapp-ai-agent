"use server";

import { refresh } from "next/cache";
import { getOwner } from "@/lib/auth/session";
import { getKnowledge } from "@/lib/dashboard/data";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export type SaleItemInput = { name: string; quantity: number; unitPrice: number | null };
export type RecordSaleInput = {
  items: SaleItemInput[];
  customerName?: string;
  phone?: string;
  note?: string;
};
export type SaleLine = { name: string; quantity: number; unitPrice: number | null; lineTotal: number | null };
export type RecordSaleResult =
  | { ok: true; id: string; receiptNo: number; createdAt: string; lines: SaleLine[]; total: number; currency: string }
  | { ok: false; error: string };

/**
 * Record an in-person cashier sale. Unlike AI orders, the owner is the one
 * entering it, so the prices they type are trusted. The sale is saved to the
 * orders table as source='cashier', status='done'.
 */
export async function recordSale(input: RecordSaleInput): Promise<RecordSaleResult> {
  const owner = await getOwner();
  if (!owner) return { ok: false, error: "auth" };

  const knowledge = await getKnowledge();
  const currency = knowledge?.currency ?? "USD";

  const items = (input.items ?? [])
    .map((i) => ({
      name: String(i.name ?? "").trim().slice(0, 120),
      quantity: Math.min(Math.max(1, Math.trunc(Number(i.quantity) || 1)), 999),
      unitPrice: i.unitPrice == null || Number.isNaN(Number(i.unitPrice)) ? null : Math.max(0, Number(i.unitPrice)),
    }))
    .filter((i) => i.name);
  if (!items.length) return { ok: false, error: "empty" };

  let total = 0;
  const lines: SaleLine[] = items.map((i) => {
    const lineTotal = i.unitPrice != null ? Number((i.unitPrice * i.quantity).toFixed(2)) : null;
    if (lineTotal != null) total += lineTotal;
    return { name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal };
  });
  total = Number(total.toFixed(2));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      business_id: owner.businessId,
      customer_name: String(input.customerName ?? "").trim().slice(0, 120),
      phone_number: String(input.phone ?? "").replace(/[ ()-]/g, "").slice(0, 32),
      items: lines,
      total,
      currency,
      note: String(input.note ?? "").trim().slice(0, 1000),
      status: "done",
      source: "cashier",
    })
    .select("id, created_at")
    .single();

  if (error || !data) {
    logger.error("cashier_sale_failed", { code: error?.code });
    return { ok: false, error: "save" };
  }

  // A simple running receipt number: how many cashier sales this business has now
  // (RLS limits the count to the owner's own orders).
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("source", "cashier");

  refresh();
  return { ok: true, id: data.id, receiptNo: count ?? 1, createdAt: data.created_at, lines, total, currency };
}
