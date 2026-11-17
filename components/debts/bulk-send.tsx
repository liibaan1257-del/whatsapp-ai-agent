"use client";

import { useState } from "react";
import { Check, MessageCircle, Send } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { updateDebt } from "@/lib/dashboard/debt-actions";
import { fmt } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type Item = { key: string; name: string; phone: string; text: string; debtId?: string };

const waLink = (i: Item) => `https://wa.me/${i.phone}?text=${encodeURIComponent(i.text)}`;

/**
 * "Send to everyone": a queue of wa.me links, one per customer, so the owner
 * sends each message from their own WhatsApp (free, no Meta template needed).
 * Debt reminders also record when the customer was reminded.
 */
export function BulkSend({ reminders, customers }: { reminders: Item[]; customers: { key: string; name: string; phone: string }[] }) {
  const t = useI18n().m.debts;
  const [tab, setTab] = useState<"reminders" | "message">(reminders.length ? "reminders" : "message");
  const [message, setMessage] = useState(t.messageDefault);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const items: Item[] =
    tab === "reminders" ? reminders : customers.map((c) => ({ ...c, key: `m:${c.key}`, text: message.replaceAll("{name}", c.name) }));
  const done = items.filter((i) => sent.has(i.key)).length;
  const next = items.find((i) => !sent.has(i.key));

  function markSent(i: Item) {
    setSent((s) => new Set(s).add(i.key));
    if (i.debtId) {
      const fd = new FormData();
      fd.set("id", i.debtId);
      fd.set("op", "reminded");
      void updateDebt(fd);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-brand text-xs font-bold text-brand-foreground">2</span>
          <Send className="size-5 text-brand" aria-hidden="true" />
          {t.sendTitle}
        </CardTitle>
        <CardDescription>{t.sendHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2" role="tablist">
          {(["reminders", "message"] as const).map((k) => (
            <Button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              variant={tab === k ? "brand" : "outline"}
              size="sm"
              onClick={() => setTab(k)}
            >
              {k === "reminders" ? fmt(t.tabReminders, { count: reminders.length }) : fmt(t.tabMessage, { count: customers.length })}
            </Button>
          ))}
        </div>

        {tab === "message" ? (
          <div className="space-y-2">
            <label htmlFor="bulk_message" className="text-sm font-medium">
              {t.messageLabel}
            </label>
            <Textarea id="bulk_message" rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        ) : null}

        {items.length ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium">{fmt(t.progress, { done, total: items.length })}</p>
              {next ? (
                <Button variant="brand" size="sm" asChild>
                  <a href={waLink(next)} target="_blank" rel="noopener noreferrer" onClick={() => markSent(next)}>
                    {t.next} {next.name}
                  </a>
                </Button>
              ) : null}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full bg-brand transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
            </div>
            <ul className="max-h-96 divide-y overflow-y-auto rounded-lg border">
              {items.map((i) => {
                const isSent = sent.has(i.key);
                return (
                  <li key={i.key} className={cn("flex items-center justify-between gap-3 px-3 py-2 text-sm", isSent && "opacity-60")}>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{i.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{i.text}</p>
                    </div>
                    {isSent ? (
                      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand">
                        <Check className="size-4" aria-hidden="true" />
                        {t.sent}
                      </span>
                    ) : (
                      <Button variant="outline" size="sm" asChild>
                        <a href={waLink(i)} target="_blank" rel="noopener noreferrer" onClick={() => markSent(i)}>
                          <MessageCircle aria-hidden="true" />
                          {t.send}
                        </a>
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{tab === "message" ? t.addCustomersFirst : t.noneToSend}</p>
        )}
      </CardContent>
    </Card>
  );
}
