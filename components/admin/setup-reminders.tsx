"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { sendSetupReminders, type AdminState } from "@/lib/dashboard/admin-actions";

/** One click: email every trial owner who hasn't set up their bot yet. */
export function SetupReminders() {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<AdminState, FormData>(sendSetupReminders, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(m.admin.setupRemindersConfirm)) e.preventDefault();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <Button type="submit" variant="outline" disabled={pending || Boolean(state.ok)}>
        <Mail aria-hidden="true" />
        {pending ? m.admin.setupRemindersSending : m.admin.setupReminders}
      </Button>
      {state.notice || state.error ? (
        <p role="status" className={state.error ? "text-sm text-destructive" : "text-sm text-brand"}>
          {state.error ?? state.notice}
        </p>
      ) : null}
    </form>
  );
}
