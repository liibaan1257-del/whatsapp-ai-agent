"use server";

import { redirect } from "next/navigation";
import { getOwner } from "@/lib/auth/session";
import { configStatus } from "@/lib/env";
import { requestMessages } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type DeleteAccountState = { error?: string };

/**
 * Deletes the signed-in owner's account for good (GDPR right to erasure).
 * The database cascades from auth.users: profile, business, conversations,
 * messages and bookings all go with it. The owner must type their email.
 */
export async function deleteAccount(_prev: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const m = await requestMessages();
  const e = m.settings.errors;
  const owner = await getOwner();
  if (!owner) return { error: m.common.signInAgain };

  const typed = String(formData.get("confirm_email") ?? "").trim().toLowerCase();
  if (!owner.email || typed !== owner.email.toLowerCase()) return { error: e.mismatch };
  if (!configStatus().serviceRole) return { error: e.notConfigured };

  // The user id comes from the verified session, never from the form.
  const { error } = await createAdminClient().auth.admin.deleteUser(owner.id);
  if (error) {
    logger.error("account_delete_failed", { ownerId: owner.id, code: error.code ?? error.status });
    return { error: e.failed };
  }
  logger.info("account_deleted", { ownerId: owner.id });
  // Clear the (now invalid) session cookies.
  await (await createClient()).auth.signOut({ scope: "local" }).catch(() => {});
  redirect("/login?deleted=1");
}
