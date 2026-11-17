"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDebt, type DebtState } from "@/lib/dashboard/debt-actions";

/** Form to add a debt: customer, phone (for the WhatsApp reminder), amount, note, due date. */
export function AddDebt({ currency, customers = [] }: { currency: string; customers?: { name: string; phone: string }[] }) {
  const t = useI18n().m.debts;
  const [state, action, pending] = useActionState<DebtState, FormData>(addDebt, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="size-5 text-brand" aria-hidden="true" />
          {t.addTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={form} action={action} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="debt_name">{t.name}</Label>
            <Input
              id="debt_name"
              name="name"
              required
              maxLength={100}
              placeholder={t.namePlaceholder}
              list="debt_customers"
              autoComplete="off"
              onChange={(e) => {
                // Picking a saved customer fills in their number.
                const c = customers.find((x) => x.name === e.target.value);
                const phone = form.current?.elements.namedItem("phone");
                if (c && phone instanceof HTMLInputElement) phone.value = `+${c.phone}`;
              }}
            />
            <datalist id="debt_customers">
              {customers.map((c) => (
                <option key={c.phone} value={c.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt_phone">{t.phone}</Label>
            <Input id="debt_phone" name="phone" type="tel" inputMode="tel" dir="ltr" maxLength={40} placeholder="061 234 5678" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt_amount">
              {t.amount} ({currency})
            </Label>
            <Input id="debt_amount" name="amount" required inputMode="decimal" dir="ltr" placeholder="15" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt_due">{t.due}</Label>
            <Input id="debt_due" name="due" type="date" dir="ltr" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="debt_note">{t.note}</Label>
            <Input id="debt_note" name="note" maxLength={300} placeholder={t.notePlaceholder} />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? t.adding : t.add}
            </Button>
            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : state.ok ? (
              <p role="status" className="text-sm text-brand">
                {t.added}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
