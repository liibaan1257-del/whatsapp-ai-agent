"use client";

import { useRef } from "react";
import Link from "next/link";
import { MessageCircle, X } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/i18n/config";
import { contactWhatsapp, PAYMENT_ACCOUNTS } from "@/lib/contact";
import { payCode } from "@/lib/pay";

/**
 * Pricing card button for a paid plan: opens a dialog with the price, the
 * payment accounts and a WhatsApp link to send the receipt (billing is manual).
 */
export function PayButton({
  planName,
  monthly,
  yearly,
  monthlyUsd,
  yearlyUsd,
  popular,
}: {
  planName: string;
  monthly: string;
  yearly: string;
  monthlyUsd: number;
  yearlyUsd: number;
  popular: boolean;
}) {
  const t = useI18n().m.landing.pay;
  const dialog = useRef<HTMLDialogElement>(null);
  const contact = contactWhatsapp();
  const waLink = contact ? `${contact.link}?text=${encodeURIComponent(fmt(t.message, { plan: planName, monthly, yearly }))}` : null;

  return (
    <>
      <Button variant={popular ? "brand" : "outline"} className="mt-6" onClick={() => dialog.current?.showModal()}>
        {t.button}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={`pay-${planName}`}
        className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id={`pay-${planName}`} className="text-lg font-semibold">
                {fmt(t.title, { plan: planName })}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{fmt(t.price, { monthly, yearly })}</p>
            </div>
            <Button variant="ghost" size="sm" aria-label={t.close} onClick={() => dialog.current?.close()}>
              <X aria-hidden="true" />
            </Button>
          </div>

          <ol className="space-y-4 text-sm">
            <li>
              <p className="font-medium">1. {t.step1}</p>
              <ul className="mt-2 grid gap-2">
                {PAYMENT_ACCOUNTS.map((a) => (
                  <li key={a.number} className="rounded-lg border px-3 py-2">
                    <p className="font-medium">{a.method}</p>
                    <p className="font-mono text-base tabular-nums" dir="ltr">
                      {a.number}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.name}</p>
                    {a.method === "EVC Plus" ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[
                          { label: t.dialMonthly, amount: monthlyUsd },
                          { label: t.dialYearly, amount: yearlyUsd },
                        ].map(({ label, amount }) => {
                          const code = payCode("evc", a.number, amount, "USD");
                          return code ? (
                            <a
                              key={label}
                              href={`tel:${encodeURIComponent(code)}`}
                              className="rounded-md border border-brand/40 bg-brand/10 px-2 py-1 font-mono text-xs text-brand hover:bg-brand/20"
                              dir="ltr"
                            >
                              📲 {label} {code}
                            </a>
                          ) : null;
                        })}
                        <p className="w-full text-xs text-muted-foreground">{t.dialHint}</p>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
            <li>
              <p className="font-medium">2. {t.step2}</p>
              {waLink ? (
                <Button variant="brand" className="mt-2 w-full" asChild>
                  <a href={waLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle aria-hidden="true" />
                    {t.whatsapp}
                  </a>
                </Button>
              ) : null}
            </li>
            <li>
              <p className="font-medium">3. {t.step3}</p>
            </li>
          </ol>

          <p className="border-t pt-4 text-sm text-muted-foreground">
            {t.noAccount}{" "}
            <Link href="/signup" className="font-medium text-brand underline-offset-4 hover:underline">
              {t.signup}
            </Link>
          </p>
        </div>
      </dialog>
    </>
  );
}
