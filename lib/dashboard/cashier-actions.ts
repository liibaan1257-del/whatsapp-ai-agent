"use server";

import { refresh } from "next/cache";
import { getOwner } from "@/lib/auth/session";
import { hasCashier, hasInventory, isPaid } from "@/lib/billing";
import { getKnowledge } from "@/lib/dashboard/data";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export type SaleItemInput = { name: string; quantity: number; unitPrice: number | null };
export type RecordSaleInput = {
  items: SaleItemInput[];
  customerName?: string;
  phone?: string;
  note?: string;
  /** Client-generated id so re-syncing an offline sale can't duplicate it. */
  clientId?: string;
  /** When the sale really happened (offline sales keep their original time). */
  at?: string;
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
  if (!(isPaid(owner.plan, owner.accessUntil) && hasCashier(owner.plan))) return { ok: false, error: "plan" };

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

  // Keep an offline sale's original time if it is sane (last 7 days, not in the future).
  const clientId = String(input.clientId ?? "").slice(0, 64) || null;
  let createdAt: string | undefined;
  if (input.at) {
    const ts = new Date(input.at).getTime();
    if (Number.isFinite(ts) && ts <= Date.now() + 60_000 && ts > Date.now() - 7 * 86_400_000) {
      createdAt = new Date(ts).toISOString();
    }
  }

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
      ...(clientId ? { client_id: clientId } : {}),
      ...(createdAt ? { created_at: createdAt } : {}),
    })
    .select("id, created_at")
    .single();

  if (error || !data) {
    // Duplicate client_id: this offline sale was already synced — treat as success so the queue clears.
    if (error?.code === "23505" && clientId) {
      const { data: existing } = await supabase
        .from("orders")
        .select("id, created_at")
        .eq("business_id", owner.businessId)
        .eq("client_id", clientId)
        .maybeSingle();
      if (existing) return { ok: true, id: existing.id, receiptNo: 0, createdAt: existing.created_at, lines, total, currency };
    }
    logger.error("cashier_sale_failed", { code: error?.code });
    return { ok: false, error: "save" };
  }

  // Take the sold items out of stock (items without a stock row are ignored).
  if (hasInventory(owner.plan)) {
    const { error: stockError } = await supabase.rpc("inventory_deduct", {
      p_business: owner.businessId,
      p_items: lines.map((l) => ({ name: l.name, quantity: l.quantity })),
    });
    if (stockError) logger.error("stock_deduct_failed", { code: stockError.code });
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
