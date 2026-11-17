import type { Metadata } from "next";
import { Suspense } from "react";
import { AddDebt } from "@/components/debts/add-debt";
import { DebtActions } from "@/components/debts/debt-actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOwner } from "@/lib/auth/session";
import { getKnowledge } from "@/lib/dashboard/data";
import { fmt, type Locale } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard/debts">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).debts.title };
}

type Debt = {
  id: string;
  customer_name: string;
  phone_number: string | null;
  amount: number;
  note: string | null;
  due_date: string | null;
  status: "open" | "paid";
  paid_at: string | null;
  reminded_at: string | null;
  created_at: string;
};

export default async function DebtsPage({ params }: PageProps<"/[lang]/dashboard/debts">) {
  const locale = localeFrom((await params).lang);
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Debts locale={locale} m={getMessages(locale)} />
    </Suspense>
  );
}

async function Debts({ locale, m }: { locale: Locale; m: Messages }) {
  const t = m.debts;
  await requireOwner("/dashboard/debts");
  const knowledge = await getKnowledge();
  const currency = knowledge?.currency ?? "USD";
  const business = knowledge?.business_name || "";
  const supabase = await createClient();
  const { data } = await supabase
    .from("debts")
    .select("id, customer_name, phone_number, amount, note, due_date, status, paid_at, reminded_at, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  const debts = (data ?? []) as Debt[];
  const open = debts.filter((d) => d.status === "open");
  const paid = debts.filter((d) => d.status === "paid").slice(0, 50);

  const money = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 });
  const day = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const today = new Date().toISOString().slice(0, 10);
  const totalOpen = open.reduce((s, d) => s + Number(d.amount), 0);
  const overdue = open.filter((d) => d.due_date && d.due_date < today);

  const remindLink = (d: Debt) => {
    if (!d.phone_number) return null;
    const text = fmt(business ? t.reminderText : t.reminderTextNoName, {
      name: d.customer_name,
      business,
      amount: money.format(Number(d.amount)),
      note: d.note ? ` (${d.note})` : "",
    });
    return `https://wa.me/${d.phone_number}?text=${encodeURIComponent(text)}`;
  };

  const table = (rows: Debt[], isPaid: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.customer}</TableHead>
          <TableHead className="text-right">{t.amount}</TableHead>
          <TableHead className="hidden sm:table-cell">{isPaid ? t.paidOn : t.due}</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">{t.actions}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((d) => {
          const late = !isPaid && d.due_date && d.due_date < today;
          return (
            <TableRow key={d.id}>
              <TableCell>
                <div className="font-medium">{d.customer_name}</div>
                {d.phone_number ? (
                  <div className="text-xs text-muted-foreground" dir="ltr">
                    +{d.phone_number}
                  </div>
                ) : null}
                {d.note ? <div className="text-xs text-muted-foreground">{d.note}</div> : null}
                {!isPaid && d.reminded_at ? (
                  <div className="text-xs text-muted-foreground">{fmt(t.remindedOn, { date: day.format(new Date(d.reminded_at)) })}</div>
                ) : null}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{money.format(Number(d.amount))}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {isPaid ? (
                  d.paid_at ? day.format(new Date(d.paid_at)) : "—"
                ) : d.due_date ? (
                  <span className={late ? "font-medium text-destructive" : ""}>
                    {day.format(new Date(`${d.due_date}T00:00:00Z`))}
                    {late ? ` · ${t.late}` : ""}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <DebtActions id={d.id} paid={isPaid} remindLink={isPaid ? null : remindLink(d)} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>{t.totalOpen}</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{money.format(totalOpen)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{t.openCount}</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{open.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{t.overdueCount}</CardDescription>
            <CardTitle className={overdue.length ? "text-3xl tabular-nums text-destructive" : "text-3xl tabular-nums"}>{overdue.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mb-6">
        <AddDebt currency={currency} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t.openTitle} <Badge variant="secondary">{open.length}</Badge>
          </CardTitle>
          <CardDescription>{t.openHint}</CardDescription>
        </CardHeader>
        <CardContent>{open.length ? table(open, false) : <p className="text-sm text-muted-foreground">{t.emptyOpen}</p>}</CardContent>
      </Card>

      {paid.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.paidTitle}</CardTitle>
          </CardHeader>
          <CardContent>{table(paid, true)}</CardContent>
        </Card>
      ) : null}
    </>
  );
}
