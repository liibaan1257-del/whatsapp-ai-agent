"use client";

import { useActionState } from "react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setBusinessPhoneId, type AdminPhoneState } from "@/lib/dashboard/whatsapp-actions";

/** Operator: set the Meta phone number ID that routes a WhatsApp number to this business. */
export function AdminPhoneForm({ businessId, phoneId, name }: { businessId: string; phoneId: string | null; name: string }) {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<AdminPhoneState, FormData>(setBusinessPhoneId, {});
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="business_id" value={businessId} />
      <Input
        name="phone_id"
        inputMode="numeric"
        dir="ltr"
        defaultValue={phoneId ?? ""}
        placeholder={m.admin.phoneIdLabel}
        aria-label={`${m.admin.phoneIdLabel}: ${name}`}
        className="h-8 w-44 text-xs"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {m.admin.setPhone}
      </Button>
      <span aria-live="polite" className="text-xs">
        {state.error ? <span className="text-destructive">{state.error}</span> : state.ok && !pending ? <span className="text-brand">{m.admin.saved}</span> : null}
      </span>
    </form>
  );
}
