"use client";

import { useMemo, useState } from "react";
import { Plus, Minus, Trash2, Receipt, Check, Printer, Send } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { recordSale, type SaleLine } from "@/lib/dashboard/cashier-actions";

type Service = { name: string; price: number | null };
type CartLine = { name: string; unitPrice: number | null; quantity: number };

export function CashierClient({
  services,
  currency,
  businessName,
}: {
  services: Service[];
  currency: string;
  businessName: string;
}) {
  const { m, locale } = useI18n();
  const t = m.cashier;

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [customName, setCustomName] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ id: string; createdAt: string; lines: SaleLine[]; total: number } | null>(null);

  const money = useMemo(() => {
    return (n: number) => {
      try {
        return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
      } catch {
        return `${currency} ${n.toFixed(2)}`;
      }
    };
  }, [locale, currency]);

  const total = cart.reduce((sum, l) => sum + (l.unitPrice != null ? l.unitPrice * l.quantity : 0), 0);

  function addService(s: Service) {
    setCart((c) => {
      const i = c.findIndex((l) => l.name === s.name && l.unitPrice === s.price);
      if (i >= 0) {
        const next = [...c];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [...c, { name: s.name, unitPrice: s.price, quantity: 1 }];
    });
  }

  function addCustom() {
    const name = customName.trim();
    const amount = Number(customAmount);
    if (!name || !(amount > 0)) return;
    setCart((c) => [...c, { name, unitPrice: amount, quantity: 1 }]);
    setCustomName("");
    setCustomAmount("");
  }

  function setQty(index: number, delta: number) {
    setCart((c) => {
      const next = [...c];
      const q = next[index].quantity + delta;
      if (q <= 0) return next.filter((_, i) => i !== index);
      next[index] = { ...next[index], quantity: q };
      return next;
    });
  }

  function removeLine(index: number) {
    setCart((c) => c.filter((_, i) => i !== index));
  }

  async function submit() {
    if (!cart.length || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await recordSale({
      items: cart.map((l) => ({ name: l.name, quantity: l.quantity, unitPrice: l.unitPrice })),
      customerName: customer,
      phone,
      note: "",
    });
    setSubmitting(false);
    if (res.ok) {
      setReceipt({ id: res.id, createdAt: res.createdAt, lines: res.lines, total: res.total });
      setCart([]);
      setCustomer("");
    } else {
      setError(t.error);
    }
  }

  function receiptText(r: { createdAt: string; lines: SaleLine[]; total: number }): string {
    const d = new Date(r.createdAt).toLocaleString(locale);
    const items = r.lines
      .map((l) => `${l.quantity} x ${l.name}${l.lineTotal != null ? "  " + money(l.lineTotal) : ""}`)
      .join("\n");
    return `${businessName}\n${t.receipt} - ${d}\n\n${items}\n\n${t.total}: ${money(r.total)}\n\n${t.thankYou}`;
  }

  function printReceipt(r: { createdAt: string; lines: SaleLine[]; total: number }) {
    const w = window.open("", "_blank", "width=380,height=560");
    if (!w) return;
    const d = new Date(r.createdAt).toLocaleString(locale);
    const rows = r.lines
      .map(
        (l) =>
          `<tr><td>${l.quantity} &times; ${escapeHtml(l.name)}</td><td style="text-align:right">${l.lineTotal != null ? money(l.lineTotal) : "—"}</td></tr>`,
      )
      .join("");
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${t.receipt}</title>
      <style>body{font-family:system-ui,Arial,sans-serif;padding:16px;max-width:300px}
      h2{margin:0 0 2px;font-size:18px}.muted{color:#666;font-size:12px;margin-bottom:12px}
      table{width:100%;border-collapse:collapse;font-size:14px}td{padding:4px 0;border-bottom:1px dashed #ddd}
      .tot{display:flex;justify-content:space-between;font-weight:700;font-size:16px;margin-top:10px}
      .ty{text-align:center;margin-top:14px;font-size:13px}</style></head>
      <body><h2>${escapeHtml(businessName)}</h2><div class="muted">${t.receipt} · ${d}</div>
      <table>${rows}</table><div class="tot"><span>${t.total}</span><span>${money(r.total)}</span></div>
      <div class="ty">${t.thankYou}</div></body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }

  const waPhone = phone.replace(/[^0-9]/g, "");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Menu / items */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{services.length ? t.tapHint : t.noItems}</p>
        {services.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">{t.addItemsLink}</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {services.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => addService(s)}
                className="flex min-h-20 flex-col justify-between rounded-xl border bg-card p-3 text-left transition hover:border-brand hover:bg-brand/5 active:scale-[0.98]"
              >
                <span className="font-medium leading-tight">{s.name}</span>
                <span className="mt-2 text-sm font-semibold tabular-nums text-brand">
                  {s.price != null ? money(s.price) : "—"}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Custom item */}
        <Card>
          <CardContent className="flex flex-wrap items-end gap-2 p-3">
            <div className="flex-1 min-w-32">
              <label className="mb-1 block text-xs text-muted-foreground">{t.customName}</label>
              <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={t.customName} />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-xs text-muted-foreground">{t.customAmount}</label>
              <Input
                type="number"
                inputMode="decimal"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <Button type="button" variant="outline" onClick={addCustom}>
              <Plus className="size-4" /> {t.addCustom}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Cart */}
      <div className="space-y-3">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2 font-semibold">
              <Receipt className="size-5 text-brand" /> {t.cart}
            </div>

            {cart.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.cartEmpty}</p>
            ) : (
              <ul className="space-y-2">
                {cart.map((l, i) => (
                  <li key={i} className="flex items-center gap-2 border-b pb-2 text-sm">
                    <div className="flex-1">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {l.unitPrice != null ? money(l.unitPrice) : "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon" variant="outline" className="size-7" onClick={() => setQty(i, -1)}>
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-6 text-center tabular-nums">{l.quantity}</span>
                      <Button type="button" size="icon" variant="outline" className="size-7" onClick={() => setQty(i, 1)}>
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <div className="w-20 text-right font-semibold tabular-nums">
                      {l.unitPrice != null ? money(l.unitPrice * l.quantity) : "—"}
                    </div>
                    <Button type="button" size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => removeLine(i)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between border-t pt-3 text-lg font-bold">
              <span>{t.total}</span>
              <span className="tabular-nums">{money(total)}</span>
            </div>

            <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder={t.customerPlaceholder} />
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phonePlaceholder} inputMode="tel" />

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="button" variant="brand" className="w-full" disabled={!cart.length || submitting} onClick={submit}>
              {submitting ? t.recording : t.record}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Receipt modal */}
      {receipt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-sm">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-brand/15 text-brand">
                  <Check className="size-7" />
                </span>
                <p className="text-lg font-bold">{t.saved}</p>
                <p className="font-semibold">{businessName}</p>
                <p className="text-xs text-muted-foreground">{new Date(receipt.createdAt).toLocaleString(locale)}</p>
              </div>

              <ul className="space-y-1 border-y py-3 text-sm">
                {receipt.lines.map((l, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>
                      {l.quantity} × {l.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{l.lineTotal != null ? money(l.lineTotal) : "—"}</span>
                  </li>
                ))}
              </ul>

              <div className="flex justify-between text-lg font-bold">
                <span>{t.total}</span>
                <span className="tabular-nums">{money(receipt.total)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => printReceipt(receipt)}>
                  <Printer className="size-4" /> {t.print}
                </Button>
                {waPhone ? (
                  <Button type="button" variant="outline" asChild>
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(receiptText(receipt))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Send className="size-4" /> {t.sendWhatsapp}
                    </a>
                  </Button>
                ) : (
                  <span />
                )}
              </div>
              <Button type="button" variant="brand" className="w-full" onClick={() => setReceipt(null)}>
                {t.newSale}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
