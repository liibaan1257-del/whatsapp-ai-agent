"use client";

import { useActionState, useState } from "react";
import { Coins } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addPayment, type DebtState } from "@/lib/dashboard/debt-actions";

/** "Part payment": a small inline form to record that the customer paid some of the debt. */
export function PartPayment({ id, left }: { id: string; left: number }) {
  const t = useI18n().m.debts;
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DebtState, FormData>(async (prev, formData) => {
    const next = await addPayment(prev, formData);
    if (next.ok) setOpen(false);
    return next;
  }, {});

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Coins aria-hidden="true" />
        {t.partPay}
      </Button>
    );
  }
  return (
    <form action={action} className="flex w-full flex-wrap items-center justify-end gap-1.5">
      <input type="hidden" name="id" value={id} />
      <Input
        name="amount"
        required
        autoFocus
        inputMode="decimal"
        dir="ltr"
        aria-label={t.partAmount}
        placeholder="0.00"
        max={left}
        className="h-8 w-24"
      />
      <Button type="submit" variant="brand" size="sm" disabled={pending}>
        {t.save}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        {t.cancel}
      </Button>
      {state.error ? (
        <p role="alert" className="w-full text-right text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
