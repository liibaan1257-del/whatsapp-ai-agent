"use client";

import { useActionState } from "react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { PLAN_NAMES } from "@/lib/billing";
import { deleteBusinessAccount, updateBilling, type AdminState } from "@/lib/dashboard/admin-actions";
import { fmt } from "@/lib/i18n/config";

/** +1 month / +1 year / pause / plan for one business. */
export function BillingActions({ businessId, name, plan }: { businessId: string; name: string; plan: string }) {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<AdminState, FormData>(updateBilling, {});
  const [delState, delAction, deleting] = useActionState<AdminState, FormData>(deleteBusinessAccount, {});
  const op = (value: string, label: string, variant: "brand" | "outline" | "ghost") => (
    <form action={action}>
      <input type="hidden" name="business_id" value={businessId} />
      <input type="hidden" name="op" value={value} />
      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        {label}
      </Button>
    </form>
  );
  return (
    <div role="group" aria-label={fmt(m.admin.actionsFor, { name })} className="flex flex-wrap items-center gap-1.5">
      {op("month", m.admin.addMonth, "brand")}
      {op("year", m.admin.addYear, "outline")}
      {op("pause", m.admin.pause, "ghost")}
      <form action={action} className="flex items-center gap-1">
        <input type="hidden" name="business_id" value={businessId} />
        <input type="hidden" name="op" value="plan" />
        <select
          name="plan"
          defaultValue={plan}
          aria-label={m.billing.plan}
          disabled={pending}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
        >
          {PLAN_NAMES.map((p) => (
            <option key={p} value={p}>
              {m.billing.plans[p]}
            </option>
          ))}
        </select>
      </form>
      <form
        action={delAction}
        onSubmit={(e) => {
          if (!window.confirm(fmt(m.admin.deleteConfirm, { name }))) e.preventDefault();
        }}
      >
        <input type="hidden" name="business_id" value={businessId} />
        <Button type="submit" size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={deleting}>
          {m.admin.delete}
        </Button>
      </form>
      <span aria-live="polite" className="text-xs">
        {delState.error ? <span className="text-destructive">{delState.error}</span> : null}
        {state.error ? <span className="text-destructive">{state.error}</span> : state.ok && !pending ? <span className="text-brand">{m.admin.saved}</span> : null}
      </span>
    </div>
  );
}
