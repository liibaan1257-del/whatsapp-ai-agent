"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, Trash2, Receipt, Check, Printer, Send, WifiOff, RefreshCw } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fmt } from "@/lib/i18n/config";
import { recordSale, type SaleLine } from "@/lib/dashboard/cashier-actions";

type Service = { name: string; price: number | null };
type CartLine = { name: string; unitPrice: number | null; quantity: number };
type QueuedSale = {
  clientId: string;
  at: string;
  lines: SaleLine[];
  total: number;
  customer: string;
  phone: string;
};

export function CashierClient({
  services,
  currency,
  businessName,
  businessId,
  offline,
}: {
  services: Service[];
  currency: string;
  businessName: string;
  businessId: string;
  /** Whether this plan keeps selling offline (Starter/Pro). The $5 cashier is online-only. */
  offline: boolean;
}) {
  const { m, locale } = useI18n();
  const t = m.cashier;

  const SVC_KEY = `rb_cashier_svc_${businessId}`;
  const QUEUE_KEY = `rb_cashier_queue_${businessId}`;
  const NO_KEY = `rb_cashier_localno_${businessId}`;

  // Services: keep a copy on the device so the till still works during an internet drop.
  const [svc, setSvc] = useState<Service[]>(services);
  useEffect(() => {
    try {
      if (services.length) {
        localStorage.setItem(SVC_KEY, JSON.stringify(services));
        setSvc(services);
      } else {
        const cached = localStorage.getItem(SVC_KEY);
        if (cached) setSvc(JSON.parse(cached) as Service[]);
      }
    } catch {
      /* storage unavailable */
    }
  }, [services, SVC_KEY]);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [customName, setCustomName] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ receiptNo: number | string; createdAt: string; lines: SaleLine[]; total: number; pending: boolean } | null>(null);

  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const flushing = useRef(false);

  const money = useMemo(() => {
    return (n: number) => {
      try {
        return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
      } catch {
        return `${currency} ${n.toFixed(2)}`;
      }
    };
  }, [locale, currency]);

  const readQueue = useCallback((): QueuedSale[] => {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedSale[];
    } catch {
      return [];
    }
  }, [QUEUE_KEY]);

  const writeQueue = useCallback(
    (q: QueuedSale[]) => {
      try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
      } catch {
        /* ignore */
      }
      setPending(q.length);
    },
    [QUEUE_KEY],
  );

  // Send any device-saved sales to the server, one by one; keep only the ones that fail.
  const flush = useCallback(async () => {
    if (flushing.current) return;
    const q = readQueue();
    if (!q.length) return;
    flushing.current = true;
    const left: QueuedSale[] = [];
    for (const s of q) {
      try {
        const res = await recordSale({
          items: s.lines.map((l) => ({ name: l.name, quantity: l.quantity, unitPrice: l.unitPrice })),
          customerName: s.customer,
          phone: s.phone,
          clientId: s.clientId,
          at: s.at,
        });
        if (!res.ok) left.push(s);
      } catch {
        left.push(s);
      }
    }
    writeQueue(left);
    flushing.current = false;
  }, [readQueue, writeQueue]);

  // Track connection and sync whenever we come back online.
  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(readQueue().length);
    const on = () => {
      setOnline(true);
      void flush();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    if (navigator.onLine) void flush();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [flush, readQueue]);

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

  function nextLocalNo(): number {
    try {
      const n = (Number(localStorage.getItem(NO_KEY)) || 0) + 1;
      localStorage.setItem(NO_KEY, String(n));
      return n;
    } catch {
      return Math.floor(Date.now() / 1000) % 100000;
    }
  }

  function uuid(): string {
    try {
      return crypto.randomUUID();
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }

  function buildLines(): SaleLine[] {
    return cart.map((l) => ({
      name: l.name,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.unitPrice != null ? Number((l.unitPrice * l.quantity).toFixed(2)) : null,
    }));
  }

  function saveOffline(lines: SaleLine[]) {
    const sale: QueuedSale = {
      clientId: uuid(),
      at: new Date().toISOString(),
      lines,
      total: Number(total.toFixed(2)),
      customer,
      phone,
    };
    writeQueue([...readQueue(), sale]);
    setReceipt({ receiptNo: `L${nextLocalNo()}`, createdAt: sale.at, lines, total: sale.total, pending: true });
    setCart([]);
    setCustomer("");
  }

  async function submit() {
    if (!cart.length || submitting) return;
    setSubmitting(true);
    setError(null);
    const lines = buildLines();

    if (!navigator.onLine) {
      if (offline) saveOffline(lines);
      else setError(t.offlineUpgrade); // online-only plan ($5): can't sell without internet
      setSubmitting(false);
      return;
    }
    try {
      const res = await recordSale({
        items: cart.map((l) => ({ name: l.name, quantity: l.quantity, unitPrice: l.unitPrice })),
        customerName: customer,
        phone,
        clientId: uuid(),
      });
      if (res.ok) {
        setReceipt({ receiptNo: res.receiptNo, createdAt: res.createdAt, lines: res.lines, total: res.total, pending: false });
        setCart([]);
        setCustomer("");
      } else {
        setError(t.error);
      }
    } catch {
      // Network died mid-sale.
      if (offline) saveOffline(lines); // keep it on the device instead of losing it
      else setError(t.offlineUpgrade);
    }
    setSubmitting(false);
  }

  function receiptText(r: { receiptNo: number | string; createdAt: string; lines: SaleLine[]; total: number }): string {
    const d = new Date(r.createdAt).toLocaleString(locale);
    const items = r.lines.map((l) => `${l.quantity} x ${l.name}${l.lineTotal != null ? "  " + money(l.lineTotal) : ""}`).join("\n");
    return `${businessName}\n${t.receipt} #${r.receiptNo} - ${d}\n\n${items}\n\n${t.total}: ${money(r.total)}\n\n${t.thankYou}`;
  }

  function printReceipt(r: { receiptNo: number | string; createdAt: string; lines: SaleLine[]; total: number }) {
    const w = window.open("", "_blank", "width=380,height=560");
    if (!w) return;
    const d = new Date(r.createdAt).toLocaleString(locale);
    const rows = r.lines
      .map((l) => `<tr><td>${l.quantity} &times; ${escapeHtml(l.name)}</td><td style="text-align:right">${l.lineTotal != null ? money(l.lineTotal) : "—"}</td></tr>`)
      .join("");
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${t.receipt}</title>
      <style>body{font-family:system-ui,Arial,sans-serif;padding:16px;max-width:300px}
      h2{margin:0 0 2px;font-size:18px}.muted{color:#666;font-size:12px;margin-bottom:12px}
      table{width:100%;border-collapse:collapse;font-size:14px}td{padding:4px 0;border-bottom:1px dashed #ddd}
      .tot{display:flex;justify-content:space-between;font-weight:700;font-size:16px;margin-top:10px}
      .ty{text-align:center;margin-top:14px;font-size:13px}</style></head>
      <body><h2>${escapeHtml(businessName)}</h2><div class="muted">${t.receipt} #${r.receiptNo} · ${d}</div>
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
      {/* Connection / sync banner */}
      {offline ? (
        !online || pending > 0 ? (
          <div className={`lg:col-span-2 flex items-center gap-2 rounded-xl border p-3 text-sm ${online ? "border-brand/30 bg-brand/5 text-brand" : "border-amber-500/30 bg-amber-500/10 text-amber-600"}`} role="status">
            {online ? <RefreshCw className="size-4 animate-spin" /> : <WifiOff className="size-4" />}
            <span>{online ? (pending > 0 ? fmt(t.pendingSync, { n: pending }) : t.syncedNote) : t.offlineNote}</span>
          </div>
        ) : null
      ) : !online ? (
        <div className="lg:col-span-2 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600" role="status">
          <WifiOff className="size-4" />
          <span>{t.offlineUpgrade}</span>
        </div>
      ) : null}

      {/* Menu / items */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{svc.length ? t.tapHint : t.noItems}</p>
        {svc.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">{t.addItemsLink}</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {svc.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => addService(s)}
                className="flex min-h-20 flex-col justify-between rounded-xl border bg-card p-3 text-left transition hover:border-brand hover:bg-brand/5 active:scale-[0.98]"
              >
                <span className="font-medium leading-tight">{s.name}</span>
                <span className="mt-2 text-sm font-semibold tabular-nums text-brand">{s.price != null ? money(s.price) : "—"}</span>
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
              <Input type="number" inputMode="decimal" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="0" />
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
                      <div className="text-xs text-muted-foreground tabular-nums">{l.unitPrice != null ? money(l.unitPrice) : "—"}</div>
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
                    <div className="w-20 text-right font-semibold tabular-nums">{l.unitPrice != null ? money(l.unitPrice * l.quantity) : "—"}</div>
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
                <p className="text-lg font-bold">{receipt.pending ? t.savedOffline : t.saved}</p>
                <p className="font-semibold">{businessName}</p>
                <p className="text-sm font-medium text-brand">
                  {t.receiptNo} #{receipt.receiptNo}
                </p>
                {receipt.pending ? <p className="text-xs text-amber-600">{t.willSync}</p> : null}
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
                    <a href={`https://wa.me/${waPhone}?text=${encodeURIComponent(receiptText(receipt))}`} target="_blank" rel="noopener noreferrer">
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
