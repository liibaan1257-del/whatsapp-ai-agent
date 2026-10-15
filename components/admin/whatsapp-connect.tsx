"use client";

import { useActionState } from "react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectWhatsApp, type AdminState } from "@/lib/dashboard/admin-actions";

/** Operator: subscribe the app to a WhatsApp Business Account (Meta). */
export function WhatsAppConnect() {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<AdminState, FormData>(connectWhatsApp, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">{m.admin.wabaLabel}</span>
        <Input name="waba_id" inputMode="numeric" autoComplete="off" required className="w-64" />
      </label>
      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? m.admin.waConnecting : m.admin.waConnect}
      </Button>
      <span aria-live="polite" className="basis-full text-sm">
        {state.error ? <span className="text-destructive">{state.error}</span> : state.notice && !pending ? <span className="text-brand">{state.notice}</span> : null}
      </span>
    </form>
  );
}
