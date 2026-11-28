"use server";

import { refresh } from "next/cache";
import { getOwner } from "@/lib/auth/session";
import { hasInventory, isPaid } from "@/lib/billing";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

function toInt(v: FormDataEntryValue | null, fallback: number): number {
  const n = Math.trunc(Number(String(v ?? "").replace(/[,\s]/g, "")));
  return Number.isFinite(n) ? Math.min(Math.max(0, n), 1_000_000) : fallback;
}

/**
 * Set an item's stock. `mode` "set" replaces the count, "add" adds to it
 * (a delivery came in). Creates the row the first time an item is stocked.
 */
export async function saveStock(formData: FormData): Promise<void> {
  const owner = await getOwner();
  if (!owner || !(isPaid(owner.plan, owner.accessUntil) && hasInventory(owner.plan))) return;
  const item = String(formData.get("item") ?? "").trim().slice(0, 120);
  if (!item) return;
  const mode = formData.get("mode") === "add" ? "add" : "set";
  const qty = toInt(formData.get("quantity"), 0);
  const lowAt = toInt(formData.get("low_at"), 5);

  const supabase = await createClient();
  const { data: rows } = await supabase.from("inventory").select("id, item, quantity").ilike("item", item.replace(/[%_\\]/g, "\\$&"));
  const existing = (rows ?? []).find((r) => r.item.toLowerCase() === item.toLowerCase());
  if (existing) {
    const quantity = mode === "add" ? Math.min(existing.quantity + qty, 1_000_000) : qty;
    const { error } = await supabase
      .from("inventory")
      .update({ quantity, low_at: lowAt, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) logger.error("stock_update_failed", { code: error.code });
  } else {
    const { error } = await supabase.from("inventory").insert({ business_id: owner.businessId, item, quantity: qty, low_at: lowAt });
    if (error) logger.error("stock_insert_failed", { code: error.code });
  }
  refresh();
}

/** Stop tracking an item's stock. */
export async function deleteStock(formData: FormData): Promise<void> {
  const owner = await getOwner();
  if (!owner) return;
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const { error } = await (await createClient()).from("inventory").delete().eq("id", id);
  if (error) logger.error("stock_delete_failed", { code: error.code });
  refresh();
}
