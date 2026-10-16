"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmt } from "@/lib/i18n/config";
import { requestWhatsAppConnection, type WhatsAppRequestState } from "@/lib/dashboard/whatsapp-actions";

/** Owner view of the WhatsApp connection: connected, request pending, or the request form. */
export function WhatsAppRequestCard({
  connected,
  requestNumber,
  requestedAt,
}: {
  connected: boolean;
  requestNumber: string | null;
  requestedAt: string | null;
}) {
  const { m, locale } = useI18n();
  const t = m.waRequest;
  const [state, action, pending] = useActionState<WhatsAppRequestState, FormData>(requestWhatsAppConnection, {});
  const [editing, setEditing] = useState(false);

  if (connected) {
    return (
      <Card id="whatsapp" className="scroll-mt-20 border-brand/40 bg-brand/5">
        <CardContent className="flex items-center gap-3 text-sm">
          <span className="size-2.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
          {t.connected}
        </CardContent>
      </Card>
    );
  }

  const pendingRequest = requestNumber && requestedAt && !editing;
  return (
    <Card id="whatsapp" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.hint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRequest ? (
          <div className="space-y-3">
            <p role="status" className="rounded-lg border border-brand/40 bg-brand/10 p-3 text-sm">
              {fmt(t.sent, {
                number: requestNumber,
                date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(requestedAt)),
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                {t.change}
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/chat-test">{t.meanwhile}</Link>
              </Button>
            </div>
          </div>
        ) : (
          <form action={action} className="space-y-4" onSubmit={() => setEditing(false)}>
            <div className="space-y-2">
              <Label htmlFor="wa_number">{t.numberLabel}</Label>
              <Input id="wa_number" name="number" type="tel" dir="ltr" required placeholder="+252 61 234 5678" defaultValue={requestNumber ?? ""} className="max-w-xs" />
            </div>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="not_on_app" required className="mt-0.5 size-4 accent-[var(--brand)]" />
              <span>
                {t.notOnApp}
                <span className="block text-xs text-muted-foreground">{t.notOnAppHelp}</span>
              </span>
            </label>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? t.sending : t.submit}
            </Button>
            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
