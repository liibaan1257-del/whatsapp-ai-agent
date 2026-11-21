"use server";

import { refresh } from "next/cache";
import { getOwner } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mark an order new or done (as the owner, under RLS). */
export async function setOrderStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "done" ? "done" : "new";
  if (!UUID.test(id) || !(await getOwner())) return;
  const supabase = await createClient();
  await supabase.from("orders").update({ status }).eq("id", id);
  refresh();
}

/** Delete an order. */
export async function deleteOrder(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id) || !(await getOwner())) return;
  const supabase = await createClient();
  await supabase.from("orders").delete().eq("id", id);
  refresh();
}
