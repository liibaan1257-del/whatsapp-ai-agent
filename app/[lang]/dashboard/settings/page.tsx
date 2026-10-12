import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ContactButton } from "@/components/billing/contact-button";
import { DeleteAccount } from "@/components/settings/delete-account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/session";
import { daysLeft, isPlan, monthStart, replyLimit } from "@/lib/billing";
import { fmt, type Locale } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard/settings">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).settings.title };
}

export default async function SettingsPage({ params }: PageProps<"/[lang]/dashboard/settings">) {
  const locale = localeFrom((await params).lang);
  const m = getMessages(locale);
  return (
    <>
      <PageHeader title={m.settings.title} description={m.settings.description} />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <Settings m={m} locale={locale} />
      </Suspense>
    </>
  );
}

async function Settings({ m, locale }: { m: Messages; locale: Locale }) {
  const owner = await requireOwner("/dashboard/settings");
  const t = m.settings;
  const b = m.billing;
  // AI replies this month (RLS: own business only).
  const { count: used } = await (await createClient())
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "assistant")
    .gte("created_at", monthStart().toISOString());
  const limit = replyLimit(owner.plan);
  const ended = daysLeft(owner.accessUntil) < 0;
  const until = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(owner.accessUntil));
  const percent = Math.min(100, Math.round(((used ?? 0) / limit) * 100));
  return (
    <div className="space-y-6">
      <Card id="plan">
        <CardHeader>
          <CardTitle>{b.planTitle}</CardTitle>
          <CardDescription>{b.howToPay}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-[12rem_1fr]">
            <dt className="text-muted-foreground">{b.plan}</dt>
            <dd className="font-medium">{isPlan(owner.plan) ? b.plans[owner.plan] : owner.plan}</dd>
            <dt className="text-muted-foreground">{b.activeUntil}</dt>
            <dd className={ended ? "font-medium text-destructive" : ""}>{ended ? fmt(b.endedOn, { date: until }) : until}</dd>
            <dt className="text-muted-foreground">{b.usage}</dt>
            <dd>
              <span>{fmt(b.usageValue, { used: used ?? 0, limit })}</span>
              <span className="mt-1.5 block h-2 max-w-xs overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <span className={`block h-full ${percent >= 100 ? "bg-destructive" : "bg-brand"}`} style={{ width: `${percent}%` }} />
              </span>
            </dd>
          </dl>
          <p className="text-xs text-muted-foreground">{b.prices}</p>
          <ContactButton m={m} email={owner.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.account}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">{t.email}</dt>
            <dd className="min-w-0 break-all" dir="ltr">
              {owner.email}
            </dd>
            <dt className="text-muted-foreground">{t.name}</dt>
            <dd>{owner.fullName || "—"}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.data}</CardTitle>
          <CardDescription>{t.dataHint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Button variant="outline" asChild>
            {/* A plain link: the browser downloads the file. */}
            <a href="/api/account/export" download>
              <Download aria-hidden="true" />
              {t.export}
            </a>
          </Button>
          <Link href="/privacy" className="text-sm underline-offset-4 hover:underline">
            {m.common.privacy}
          </Link>
          <Link href="/terms" className="text-sm underline-offset-4 hover:underline">
            {m.terms.link}
          </Link>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">{t.danger}</CardTitle>
          <CardDescription>{t.dangerHint}</CardDescription>
        </CardHeader>
        <CardContent>{owner.email ? <DeleteAccount email={owner.email} /> : null}</CardContent>
      </Card>
    </div>
  );
}
