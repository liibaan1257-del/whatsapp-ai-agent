import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BillingActions } from "@/components/admin/billing-actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOwner } from "@/lib/auth/session";
import { isActive, isNewSignup, isPlan, monthStart, replyLimit } from "@/lib/billing";
import { configStatus } from "@/lib/env";
import type { Locale } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard/admin">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).admin.title };
}

export default async function AdminPage({ params, searchParams }: PageProps<"/[lang]/dashboard/admin">) {
  const locale = localeFrom((await params).lang);
  const m = getMessages(locale);
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Admin searchParams={searchParams} m={m} locale={locale} />
    </Suspense>
  );
}

async function Admin({
  searchParams,
  m,
  locale,
}: {
  searchParams: PageProps<"/[lang]/dashboard/admin">["searchParams"];
  m: Messages;
  locale: Locale;
}) {
  const owner = await requireOwner("/dashboard/admin");
  // Operator only; everyone else gets "page not found" (it doesn't exist for them).
  if (!owner.isAdmin) notFound();
  const t = m.admin;
  if (!configStatus().serviceRole) return <p className="text-sm text-destructive">{t.notConfigured}</p>;

  const q = String((await searchParams).q ?? "").trim().toLowerCase().slice(0, 100);
  const db = createAdminClient();
  const { data: businesses } = await db
    .from("business_knowledge")
    .select("id, owner_id, business_name, plan, access_until, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const ownerIds = (businesses ?? []).map((b) => b.owner_id);
  const { data: profiles } = ownerIds.length ? await db.from("profiles").select("id, email, full_name").in("id", ownerIds) : { data: [] };
  const ownerOf = new Map((profiles ?? []).map((p) => [p.id, { email: p.email ?? "", name: p.full_name ?? "" }]));
  const rows = (businesses ?? [])
    .map((b) => ({ ...b, email: ownerOf.get(b.owner_id)?.email ?? "", ownerName: ownerOf.get(b.owner_id)?.name ?? "" }))
    .filter((b) => !q || [b.email, b.business_name ?? "", b.ownerName].some((v) => v.toLowerCase().includes(q)))
    .slice(0, 100);

  // This month's AI replies per business shown.
  const since = monthStart().toISOString();
  const counts = await Promise.all(
    rows.map(async (b) => {
      const { count } = await db
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("business_id", b.id)
        .eq("role", "assistant")
        .gte("created_at", since);
      return count ?? 0;
    }),
  );
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <form className="mb-4 flex max-w-md gap-2" role="search">
        <Input name="q" type="search" defaultValue={q} placeholder={t.search} aria-label={t.search} />
        <Button type="submit" variant="outline">
          {t.searchButton}
        </Button>
      </form>
      <Card className="py-0">
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">{t.empty}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-4">{t.business}</TableHead>
                  <TableHead>{t.joined}</TableHead>
                  <TableHead>{m.billing.plan}</TableHead>
                  <TableHead>{t.until}</TableHead>
                  <TableHead>{t.replies}</TableHead>
                  <TableHead className="pe-4">{m.table.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b, i) => {
                  const active = isActive(b.access_until);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="ps-4">
                        {b.business_name ? (
                          <div className="font-medium">{b.business_name}</div>
                        ) : (
                          <div className="text-sm italic text-muted-foreground">{t.noName}</div>
                        )}
                        {b.ownerName && <div className="text-sm">{b.ownerName}</div>}
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {b.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{date.format(new Date(b.created_at))}</div>
                        {isNewSignup(b.created_at) && (
                          <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-600 dark:text-sky-400">{t.newBadge}</span>
                        )}
                      </TableCell>
                      <TableCell>{isPlan(b.plan) ? m.billing.plans[b.plan] : b.plan}</TableCell>
                      <TableCell>
                        <div>{date.format(new Date(b.access_until))}</div>
                        <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", active ? "bg-brand/15 text-brand" : "bg-destructive/10 text-destructive")}>
                          {active ? t.active : t.ended}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {counts[i]} / {replyLimit(b.plan)}
                      </TableCell>
                      <TableCell className="pe-4">
                        <BillingActions businessId={b.id} name={b.business_name || b.ownerName || b.email} plan={b.plan} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
