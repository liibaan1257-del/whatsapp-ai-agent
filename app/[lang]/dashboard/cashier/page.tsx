import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Lock } from "lucide-react";
import { CashierClient } from "@/components/dashboard/cashier-client";
import { LiveRefresh } from "@/components/dashboard/live-refresh";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { hasCashier, isPaid } from "@/lib/billing";
import { requireOwner } from "@/lib/auth/session";
import { getKnowledge } from "@/lib/dashboard/data";
import { formatDateTime } from "@/lib/format";
import { getMessages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { type Locale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { partsInZone, zonedToUtc } from "@/lib/time";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard/cashier">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).cashier.title };
}

/** The first number in a free-form price like "8,000", "$5" or "Ksh 1,200". */
function parsePrice(price: string): number | null {
  const m = price.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function money(currency: string, n: number, locale: Locale): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export default async function CashierPage({ params }: PageProps<"/[lang]/dashboard/cashier">) {
  const locale = localeFrom((await params).lang);
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Cashier locale={locale} />
    </Suspense>
  );
}

async function Cashier({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const t = m.cashier;
  const owner = await requireOwner("/dashboard/cashier");
  const knowledge = await getKnowledge();
  const currency = knowledge?.currency ?? "USD";
  const tz = knowledge?.timezone ?? "UTC";
  const tf = knowledge?.time_format ?? "24h";
  const businessName = knowledge?.business_name || m.meta.appName;

  // Cashier is a paid feature (its own $10 plan, or included in Starter/Pro).
  if (!(isPaid(owner.plan, owner.accessUntil) && hasCashier(owner.plan))) {
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

  const services = (knowledge?.services ?? []).map((s) => ({ name: s.name, price: parsePrice(s.price) }));

  // Today's cashier sales (since local midnight in the business's time zone).
  const p = partsInZone(new Date(), tz);
  const midnight = zonedToUtc(`${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`, "00:00", tz);
  const supabase = await createClient();
  const { data: today } = await supabase
    .from("orders")
    .select("total")
    .eq("source", "cashier")
    .gte("created_at", (midnight ?? new Date(Date.now() - 86_400_000)).toISOString());
  const todayCount = today?.length ?? 0;
  const todayTotal = (today ?? []).reduce((sum, r) => sum + Number(r.total ?? 0), 0);

  const { data: recent } = await supabase
    .from("orders")
    .select("id, total, currency, created_at")
    .eq("source", "cashier")
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div className="space-y-6">
      <LiveRefresh businessId={owner.businessId} tables={["orders"]} />
      <PageHeader title={t.title} description={t.subtitle} />

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.todayTotal}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand">{money(currency, todayTotal, locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t.todaySales}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{todayCount}</p>
          </CardContent>
        </Card>
      </div>

      <CashierClient services={services} currency={currency} businessName={businessName} />

      {recent && recent.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t.recent}</h2>
          <Card>
            <CardContent className="divide-y p-0">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{formatDateTime(r.created_at, tz, tf, locale)}</span>
                  <span className="font-semibold tabular-nums">{money(r.currency || currency, Number(r.total ?? 0), locale)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
