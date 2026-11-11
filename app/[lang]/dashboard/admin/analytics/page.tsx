import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { daysAgo } from "@/lib/analytics";
import { requireOwner } from "@/lib/auth/session";
import { configStatus } from "@/lib/env";
import type { Locale } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

const RANGES = [1, 7, 30] as const;
type Range = (typeof RANGES)[number];

type Row = { created_at: string; path: string; referrer_host: string | null; utm_source: string | null; country: string | null; device: string | null; session_id: string | null };

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard/admin/analytics">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).adminAnalytics.title };
}

export default async function AnalyticsPage({ params, searchParams }: PageProps<"/[lang]/dashboard/admin/analytics">) {
  const locale = localeFrom((await params).lang);
  const m = getMessages(locale);
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Analytics searchParams={searchParams} m={m} locale={locale} />
    </Suspense>
  );
}

function top(rows: Row[], key: (r: Row) => string, limit = 10): [string, number][] {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function BarList({ title, items, empty, format }: { title: string; items: [string, number][]; empty: string; format?: (k: string) => string }) {
  const max = Math.max(1, ...items.map(([, n]) => n));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map(([k, n]) => (
              <li key={k} className="relative overflow-hidden rounded-md px-2 py-1">
                <span className="absolute inset-y-0 start-0 rounded-md bg-brand/15" style={{ width: `${(n / max) * 100}%` }} aria-hidden="true" />
                <span className="relative flex justify-between gap-3">
                  <span className="truncate" dir="auto">{format ? format(k) : k}</span>
                  <span className="font-medium tabular-nums">{n}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

async function Analytics({
  searchParams,
  m,
  locale,
}: {
  searchParams: PageProps<"/[lang]/dashboard/admin/analytics">["searchParams"];
  m: Messages;
  locale: Locale;
}) {
  const owner = await requireOwner("/dashboard/admin/analytics");
  // Operator only; everyone else gets "page not found".
  if (!owner.isAdmin) notFound();
  const t = m.adminAnalytics;
  if (!configStatus().serviceRole) return <p className="text-sm text-destructive">{m.admin.notConfigured}</p>;

  const asked = Number((await searchParams).days);
  const days: Range = (RANGES as readonly number[]).includes(asked) ? (asked as Range) : 7;
  const since = daysAgo(days);

  const db = createAdminClient();
  const [{ data }, { count: signups }] = await Promise.all([
    db.from("page_views").select("created_at, path, referrer_host, utm_source, country, device, session_id").gte("created_at", since).order("created_at", { ascending: false }).limit(20000),
    db.from("business_knowledge").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);
  const rows = (data ?? []) as Row[];
  const visitors = new Set(rows.map((r) => r.session_id).filter(Boolean)).size;

  const countryName = new Intl.DisplayNames([locale], { type: "region" });
  const country = (code: string) => {
    if (code === "-") return t.unknown;
    try {
      return countryName.of(code) ?? code;
    } catch {
      return code;
    }
  };
  const devices: Record<string, string> = { mobile: t.mobile, tablet: t.tablet, desktop: t.desktop, "-": t.unknown };
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "Africa/Kampala" });
  const perDay = top(rows, (r) => r.created_at.slice(0, 10), 31).sort((a, b) => a[0].localeCompare(b[0]));

  const stats = [
    { label: t.views, value: rows.length },
    { label: t.visitors, value: visitors },
    { label: t.signups, value: signups ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin">{t.back}</Link>
          </Button>
        }
      />
      <nav className="flex gap-2" aria-label={t.range}>
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/dashboard/admin/analytics?days=${r}`}
            className={cn("rounded-full border px-3 py-1 text-sm", r === days ? "border-brand bg-brand/15 font-medium text-brand" : "hover:bg-muted")}
            aria-current={r === days ? "page" : undefined}
          >
            {r === 1 ? t.today : r === 7 ? t.week : t.month}
          </Link>
        ))}
      </nav>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarList title={t.topPages} items={top(rows, (r) => r.path)} empty={t.empty} />
        <BarList title={t.sources} items={top(rows, (r) => r.utm_source ?? r.referrer_host ?? t.direct)} empty={t.empty} />
        <BarList title={t.countries} items={top(rows, (r) => r.country ?? "-")} empty={t.empty} format={country} />
        <BarList title={t.devices} items={top(rows, (r) => r.device ?? "-")} empty={t.empty} format={(k) => devices[k] ?? k} />
        {days > 1 ? <BarList title={t.perDay} items={perDay} empty={t.empty} format={(k) => day.format(new Date(`${k}T12:00:00Z`))} /> : null}
      </div>
      <p className="text-xs text-muted-foreground">{t.privacyNote}</p>
    </div>
  );
}
