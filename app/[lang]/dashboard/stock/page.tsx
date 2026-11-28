import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Lock, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/session";
import { hasInventory, isPaid } from "@/lib/billing";
import { getKnowledge } from "@/lib/dashboard/data";
import { deleteStock, saveStock } from "@/lib/dashboard/stock-actions";
import { fmt, type Locale } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard/stock">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).stock.title };
}

type Row = { id: string; item: string; quantity: number; low_at: number };

export default async function StockPage({ params }: PageProps<"/[lang]/dashboard/stock">) {
  const locale = localeFrom((await params).lang);
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Stock locale={locale} m={getMessages(locale)} />
    </Suspense>
  );
}

async function Stock({ locale, m }: { locale: Locale; m: Messages }) {
  const t = m.stock;
  const owner = await requireOwner("/dashboard/stock");

  if (!(isPaid(owner.plan, owner.accessUntil) && hasInventory(owner.plan))) {
    return (
      <div className="space-y-6">
        <PageHeader title={t.title} description={t.subtitle} />
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-5 text-brand" aria-hidden="true" />
              {t.lockedTitle}
            </CardTitle>
            <CardDescription>{t.lockedBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="brand" asChild>
              <Link href="/dashboard/settings#plan">{t.lockedCta}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const knowledge = await getKnowledge();
  const supabase = await createClient();
  const { data } = await supabase.from("inventory").select("id, item, quantity, low_at").order("item").limit(500);
  const rows = (data ?? []) as Row[];
  const tracked = new Set(rows.map((r) => r.item.toLowerCase()));
  const untracked = (knowledge?.services ?? []).map((s) => s.name).filter((n) => !tracked.has(n.toLowerCase()));
  const out = rows.filter((r) => r.quantity <= 0);
  const low = rows.filter((r) => r.quantity > 0 && r.quantity <= r.low_at);
  const num = new Intl.NumberFormat(locale);

  const status = (r: Row) =>
    r.quantity <= 0 ? (
      <Badge variant="destructive">{t.outBadge}</Badge>
    ) : r.quantity <= r.low_at ? (
      <Badge className="border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400">{t.lowBadge}</Badge>
    ) : (
      <Badge variant="brand">{t.okBadge}</Badge>
    );

  return (
    <div className="space-y-6">
      <PageHeader title={t.title} description={t.subtitle} />

      <div className="grid grid-cols-3 gap-3 sm:max-w-lg">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.tracked}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.low}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600">{low.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.out}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-destructive">{out.length}</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">{t.howItWorks}</p>

      {rows.length ? (
        <Card>
          <CardContent className="divide-y p-0">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{r.item}</span>
                    {status(r)}
                  </div>
                  <p className="text-sm text-muted-foreground tabular-nums">{fmt(t.left, { n: num.format(r.quantity) })}</p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <form action={saveStock} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="item" value={r.item} />
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      {t.quantity}
                      <Input name="quantity" type="number" inputMode="numeric" min={0} required defaultValue={r.quantity} className="h-9 w-24" />
                    </label>
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      {t.lowAt}
                      <Input name="low_at" type="number" inputMode="numeric" min={0} defaultValue={r.low_at} className="h-9 w-20" />
                    </label>
                    <Button type="submit" name="mode" value="set" size="sm" variant="outline">
                      {t.set}
                    </Button>
                    <Button type="submit" name="mode" value="add" size="sm" variant="brand">
                      {t.add}
                    </Button>
                  </form>
                  <form action={deleteStock}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" size="sm" variant="ghost" aria-label={t.remove} title={t.remove}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">{t.empty}</CardContent>
        </Card>
      )}

      {untracked.length ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t.notTracked}</h2>
          <Card>
            <CardContent className="divide-y p-0">
              {untracked.map((name) => (
                <form key={name} action={saveStock} className="flex flex-wrap items-end justify-between gap-2 px-4 py-3">
                  <input type="hidden" name="item" value={name} />
                  <input type="hidden" name="mode" value="set" />
                  <span className="font-medium">{name}</span>
                  <div className="flex items-end gap-2">
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      {t.quantity}
                      <Input name="quantity" type="number" inputMode="numeric" min={0} required placeholder="0" className="h-9 w-24" />
                    </label>
                    <Button type="submit" size="sm" variant="outline">
                      {t.startTracking}
                    </Button>
                  </div>
                </form>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.addItem}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveStock} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="mode" value="set" />
            <label className="grid flex-1 gap-1 text-xs text-muted-foreground">
              {t.itemName}
              <Input name="item" required maxLength={120} className="h-9 min-w-40" />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              {t.quantity}
              <Input name="quantity" type="number" inputMode="numeric" min={0} required className="h-9 w-24" />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              {t.lowAt}
              <Input name="low_at" type="number" inputMode="numeric" min={0} defaultValue={5} className="h-9 w-20" />
            </label>
            <Button type="submit" size="sm" variant="brand">
              {t.addItemCta}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
