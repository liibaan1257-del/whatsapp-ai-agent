"use server";

import { refresh } from "next/cache";
import { getOwner } from "@/lib/auth/session";
import { requestMessages } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DebtState = { ok?: boolean; error?: string };

/** "+252 61-234 5678" / "00252…" → "252612345678"; "" when empty; null when not a full international number. */
function phoneDigits(raw: string): string | null {
  const s = raw.trim();
  if (!s) return "";
  if (!/^[+\d\s().-]+$/.test(s)) return null;
  const digits = s.replace(/\D/g, "").replace(/^00/, "");
  return /^[1-9]\d{6,14}$/.test(digits) ? digits : null;
}

/** Owner adds a debt to their own book (RLS: business_id must be theirs). */
export async function addDebt(_prev: DebtState, formData: FormData): Promise<DebtState> {
  const m = await requestMessages();
  const t = m.debts.errors;
  const owner = await getOwner();
  if (!owner) return { error: m.common.signInAgain };

  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim();
  const amount = Number(String(formData.get("amount") ?? "").replace(/[, ]/g, ""));
  const note = String(formData.get("note") ?? "").trim();
  const due = String(formData.get("due") ?? "").trim();
  const phone = phoneDigits(String(formData.get("phone") ?? "").slice(0, 40));

  if (!name || name.length > 100) return { error: t.name };
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 10_000_000) return { error: t.amount };
  if (phone === null) return { error: t.phone };
  if (note.length > 300) return { error: t.note };
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: t.due };

  const supabase = await createClient();
  const { error } = await supabase.from("debts").insert({
    business_id: owner.businessId,
    customer_name: name,
    phone_number: phone || null,
    amount: Math.round(amount * 100) / 100,
    note: note || null,
    due_date: due || null,
  });
  if (error) {
    logger.error("debt_add_failed", { ownerId: owner.id, code: error.code });
    return { error: t.failed };
  }
  refresh();
  return { ok: true };
}

/** Mark paid / reopen, record a reminder, or delete. */
export async function updateDebt(formData: FormData): Promise<void> {
  const owner = await getOwner();
  if (!owner) return;
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const now = new Date().toISOString();
  const result =
    op === "paid"
      ? await supabase.from("debts").update({ status: "paid", paid_at: now }).eq("id", id)
      : op === "open"
        ? await supabase.from("debts").update({ status: "open", paid_at: null }).eq("id", id)
        : op === "reminded"
          ? await supabase.from("debts").update({ reminded_at: now }).eq("id", id)
          : op === "delete"
            ? await supabase.from("debts").delete().eq("id", id)
            : null;
  if (result?.error) logger.error("debt_update_failed", { ownerId: owner.id, op, code: result.error.code });
  refresh();
}
