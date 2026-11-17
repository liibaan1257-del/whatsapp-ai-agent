"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { getOwner } from "@/lib/auth/session";
import { requestMessages } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { normalizeWhatsapp } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DebtState = { ok?: boolean; error?: string };

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
  const country = ((await headers()).get("x-vercel-ip-country") ?? "").toUpperCase();
  const phone = normalizeWhatsapp(String(formData.get("phone") ?? "").slice(0, 40), country);

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
  // Keep the customer in the list for next time (an existing number is left as is).
  if (phone) {
    await supabase
      .from("customers")
      .upsert({ business_id: owner.businessId, name, phone_number: phone }, { onConflict: "business_id,phone_number", ignoreDuplicates: true });
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

/** Record a part payment; marks the debt paid once nothing is left. */
export async function addPayment(_prev: DebtState, formData: FormData): Promise<DebtState> {
  const m = await requestMessages();
  const t = m.debts.errors;
  const owner = await getOwner();
  if (!owner) return { error: m.common.signInAgain };
  const id = String(formData.get("id") ?? "");
  const amount = Math.round(Number(String(formData.get("amount") ?? "").replace(/[, ]/g, "")) * 100) / 100;
  if (!UUID.test(id)) return { error: t.failed };

  const supabase = await createClient();
  const [{ data: debt }, { data: paid }] = await Promise.all([
    supabase.from("debts").select("amount, status").eq("id", id).maybeSingle(),
    supabase.from("debt_payments").select("amount").eq("debt_id", id),
  ]);
  if (!debt || debt.status !== "open") return { error: t.failed };
  const left = Math.round((Number(debt.amount) - (paid ?? []).reduce((s, p) => s + Number(p.amount), 0)) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > left) return { error: t.partAmount };

  const { error } = await supabase.from("debt_payments").insert({ debt_id: id, business_id: owner.businessId, amount });
  if (error) {
    logger.error("debt_payment_failed", { ownerId: owner.id, code: error.code });
    return { error: t.failed };
  }
  if (amount >= left) await supabase.from("debts").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
  refresh();
  return { ok: true };
}

/** Undo a part payment (the debt goes back to open). */
export async function deletePayment(formData: FormData): Promise<void> {
  const owner = await getOwner();
  if (!owner) return;
  const id = String(formData.get("id") ?? "");
  const debtId = String(formData.get("debtId") ?? "");
  if (!UUID.test(id) || !UUID.test(debtId)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("debt_payments").delete().eq("id", id).eq("debt_id", debtId);
  if (error) logger.error("debt_payment_delete_failed", { ownerId: owner.id, code: error.code });
  else await supabase.from("debts").update({ status: "open", paid_at: null }).eq("id", debtId);
  refresh();
}
