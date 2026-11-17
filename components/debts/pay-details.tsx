"use client";

import { useActionState, useState } from "react";
import { Wallet } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { savePayDetails, type DebtState } from "@/lib/dashboard/debt-actions";
import { fmt } from "@/lib/i18n/config";
import { PAY_METHODS, payCode } from "@/lib/pay";

/** Where customers send money; shown in every debt reminder, with a dialable code for EVC Plus / Zaad. */
export function PayDetails({ method, number, currency }: { method: string | null; number: string | null; currency: string }) {
  const t = useI18n().m.debts;
  const [state, action, pending] = useActionState<DebtState, FormData>(savePayDetails, {});
  const [m, setM] = useState(method ?? "");
  const [n, setN] = useState(number ?? "");
  const code = payCode(m || null, n || null, 12, currency);
  const label = m ? t.payMethods[m as keyof typeof t.payMethods] : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-5 text-brand" aria-hidden="true" />
          {t.payTitle}
        </CardTitle>
        <CardDescription>{t.payHint}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
            <select
              name="pay_method"
              value={m}
              onChange={(e) => setM(e.target.value)}
              aria-label={t.payMethod}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">{t.payNone}</option>
              {PAY_METHODS.map((k) => (
                <option key={k} value={k}>
                  {t.payMethods[k]}
                </option>
              ))}
            </select>
            <Input
              name="pay_number"
              value={n}
              onChange={(e) => setN(e.target.value)}
              maxLength={60}
              dir="ltr"
              placeholder={t.payNumberPlaceholder}
              aria-label={t.payNumber}
              disabled={!m}
            />
          </div>
          {code ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">{t.payPreview} </span>
              {fmt(t.payLine, { method: label, code })}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="brand" size="sm" disabled={pending}>
              {t.paySave}
            </Button>
            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : state.ok ? (
              <p role="status" className="text-sm text-brand">
                {t.paySaved}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
