import type { Metadata } from "next";
import { Suspense } from "react";
import { X } from "lucide-react";
import { AddDebt } from "@/components/debts/add-debt";
import { BulkSend } from "@/components/debts/bulk-send";
import { CustomersCard } from "@/components/debts/customers-card";
import { DebtActions } from "@/components/debts/debt-actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOwner } from "@/lib/auth/session";
import { deletePayment } from "@/lib/dashboard/debt-actions";
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

type Payment = { id: string; debt_id: string; amount: number; created_at: string };

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
  const { data: payData } = debts.length
    ? await supabase
        .from("debt_payments")
        .select("id, debt_id, amount, created_at")
        .in(
          "debt_id",
          debts.map((d) => d.id),
        )
        .order("created_at")
    : { data: [] };
  const payments = new Map<string, Payment[]>();
  for (const p of (payData ?? []) as Payment[]) payments.set(p.debt_id, [...(payments.get(p.debt_id) ?? []), p]);
  const paidSum = (d: Debt) => (payments.get(d.id) ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const leftOf = (d: Debt) => Math.max(0, Math.round((Number(d.amount) - paidSum(d)) * 100) / 100);
  const { data: custData } = await supabase.from("customers").select("id, name, phone_number").order("name").limit(2000);
  const customers = (custData ?? []) as { id: string; name: string; phone_number: string }[];
  const open = debts.filter((d) => d.status === "open");
  const paid = debts.filter((d) => d.status === "paid").slice(0, 50);

  const money = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 });
  const day = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const today = new Date().toISOString().slice(0, 10);
  const totalOpen = open.reduce((s, d) => s + leftOf(d), 0);
  const overdue = open.filter((d) => d.due_date && d.due_date < today);

  const reminderText = (d: Debt) =>
    fmt(business ? t.reminderText : t.reminderTextNoName, {
      name: d.customer_name,
      business,
      amount: money.format(leftOf(d)),
      note: d.note ? ` (${d.note})` : "",
    });
  const owedByPhone = new Map<string, number>();
  for (const d of open) if (d.phone_number) owedByPhone.set(d.phone_number, (owedByPhone.get(d.phone_number) ?? 0) + leftOf(d));

  const remindLink = (d: Debt) => {
    if (!d.phone_number) return null;
    const text = fmt(business ? t.reminderText : t.reminderTextNoName, {
      name: d.customer_name,
      business,
      amount: money.format(leftOf(d)),
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
                {(payments.get(d.id) ?? []).map((p) => (
                  <form key={p.id} action={deletePayment} className="flex items-center gap-1 text-xs text-brand">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="debtId" value={d.id} />
                    <span>{fmt(t.paymentLine, { amount: money.format(Number(p.amount)), date: day.format(new Date(p.created_at)) })}</span>
                    <Button type="submit" variant="ghost" size="sm" className="h-5 px-1" aria-label={t.undoPayment} title={t.undoPayment}>
                      <X aria-hidden="true" className="size-3" />
                    </Button>
                  </form>
                ))}
                {!isPaid && d.reminded_at ? (
                  <div className="text-xs text-muted-foreground">{fmt(t.remindedOn, { date: day.format(new Date(d.reminded_at)) })}</div>
                ) : null}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {!isPaid && paidSum(d) > 0 ? (
                  <>
                    <div className="font-semibold">{fmt(t.left, { left: money.format(leftOf(d)) })}</div>
                    <div className="text-xs text-muted-foreground">{fmt(t.ofTotal, { total: money.format(Number(d.amount)) })}</div>
                  </>
                ) : (
                  <span className="font-semibold">{money.format(Number(d.amount))}</span>
                )}
              </TableCell>
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
                <DebtActions id={d.id} paid={isPaid} left={leftOf(d)} remindLink={isPaid ? null : remindLink(d)} />
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
        <AddDebt currency={currency} customers={customers.map((c) => ({ name: c.name, phone: c.phone_number }))} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <BulkSend
          reminders={open
            .filter((d) => d.phone_number && leftOf(d) > 0)
            .map((d) => ({ key: d.id, debtId: d.id, name: d.customer_name, phone: d.phone_number as string, text: reminderText(d) }))}
          customers={customers.map((c) => ({ key: c.id, name: c.name, phone: c.phone_number }))}
        />
        <CustomersCard
          customers={customers.map((c) => {
            const owed = owedByPhone.get(c.phone_number);
            return { id: c.id, name: c.name, phone: c.phone_number, owes: owed ? fmt(t.owes, { amount: money.format(owed) }) : null };
          })}
        />
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
