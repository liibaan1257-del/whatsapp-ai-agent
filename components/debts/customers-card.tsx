"use client";

import { useActionState, useState } from "react";
import { Contact, Trash2 } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addCustomers, deleteCustomer, type CustomerState } from "@/lib/dashboard/customer-actions";

export type CustomerRow = { id: string; name: string; phone: string; owes: string | null };

/** Customer list: add one, paste many ("name, number" per line), remove. */
export function CustomersCard({ customers }: { customers: CustomerRow[] }) {
  const t = useI18n().m.debts;
  const [bulk, setBulk] = useState(false);
  const [state, action, pending] = useActionState<CustomerState, FormData>(addCustomers, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Contact className="size-5 text-brand" aria-hidden="true" />
          <span className="grid size-6 place-items-center rounded-full bg-brand text-xs font-bold text-brand-foreground">1</span>
          {t.customersTitle} <span className="text-sm font-normal text-muted-foreground">({customers.length})</span>
        </CardTitle>
        <CardDescription>{t.customersHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form key={state.notice ?? "form"} action={action} className="space-y-3">
          {bulk ? (
            <>
              <p className="text-sm text-muted-foreground">{t.bulkHint}</p>
              <Textarea name="lines" rows={6} dir="ltr" placeholder={t.bulkPlaceholder} aria-label={t.bulkToggle} required />
            </>
          ) : (
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
              <Input name="name" required maxLength={100} placeholder={t.namePlaceholder} aria-label={t.name} />
              <Input name="phone" required type="tel" inputMode="tel" dir="ltr" maxLength={40} placeholder="061 234 5678" aria-label={t.phone} />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="brand" size="sm" disabled={pending}>
              {bulk ? t.saveCustomers : t.addCustomer}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setBulk((b) => !b)}>
              {bulk ? t.addCustomer : t.bulkToggle}
            </Button>
            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : state.notice ? (
              <p role="status" className="text-sm text-brand">
                {state.notice}
              </p>
            ) : null}
          </div>
        </form>

        {customers.length ? (
          <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border">
            {customers.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    +{c.phone}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {c.owes ? <span className="text-xs font-medium text-destructive">{c.owes}</span> : null}
                  <form action={deleteCustomer}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" variant="ghost" size="sm" aria-label={t.removeCustomer} title={t.removeCustomer}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t.noCustomers}</p>
        )}
      </CardContent>
    </Card>
  );
}
