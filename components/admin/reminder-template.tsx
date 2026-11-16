"use client";

import { useActionState } from "react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { createReminderTemplate, type AdminState } from "@/lib/dashboard/admin-actions";

/** Operator: create the booking reminder template on Meta, or show its approval status. */
export function ReminderTemplate() {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<AdminState, FormData>(createReminderTemplate, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? m.admin.templateWorking : m.admin.templateButton}
      </Button>
      <span aria-live="polite" className="text-sm">
        {state.error ? <span className="text-destructive">{state.error}</span> : state.notice && !pending ? <span className="text-brand">{state.notice}</span> : null}
      </span>
    </form>
  );
}
