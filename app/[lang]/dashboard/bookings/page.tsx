import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Trash2 } from "lucide-react";
import { AddBooking } from "@/components/bookings/add-booking";
import { StatusActions } from "@/components/bookings/status-actions";
import { LiveRefresh } from "@/components/dashboard/live-refresh";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOwner } from "@/lib/auth/session";
import { deleteBooking } from "@/lib/dashboard/booking-actions";
import { getKnowledge, type BookingRow } from "@/lib/dashboard/data";
import { formatDateTime, STATUS_STYLES } from "@/lib/format";
import { fmt, type Locale } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard/bookings">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).bookings.title };
}

const VIEWS = ["upcoming", "pending", "past", "all"] as const;
type View = (typeof VIEWS)[number];
const LIMIT = 100;

export default async function BookingsPage({ params, searchParams }: PageProps<"/[lang]/dashboard/bookings">) {
  const locale = localeFrom((await params).lang);
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Bookings searchParams={searchParams} locale={locale} m={getMessages(locale)} />
    </Suspense>
  );
}

async function Bookings({
  searchParams,
  locale,
  m,
}: {
  searchParams: PageProps<"/[lang]/dashboard/bookings">["searchParams"];
  locale: Locale;
  m: Messages;
}) {
  const t = m.bookings;
  const owner = await requireOwner("/dashboard/bookings");
  const params = await searchParams;
  const view: View = typeof params.view === "string" && (VIEWS as readonly string[]).includes(params.view) ? (params.view as View) : "upcoming";
  const knowledge = await getKnowledge();
  const tz = knowledge?.timezone ?? "UTC";
  const tf = knowledge?.time_format ?? "24h";
  const now = new Date().toISOString();

  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("id, conversation_id, customer_name, phone_number, service_selected, date_time, status, notes, source, created_at, reminder_status, conversations(channel)");
  if (view === "upcoming") query = query.gte("date_time", now).in("status", ["pending", "confirmed"]).order("date_time");
  else if (view === "pending") query = query.eq("status", "pending").order("date_time");
  else if (view === "past") query = query.lt("date_time", now).order("date_time", { ascending: false });
  else query = query.order("date_time", { ascending: false });
  const { data, error } = await query.limit(LIMIT);
  const bookings = (data ?? []) as unknown as BookingRow[];

  return (
    <>
      <PageHeader
        title={t.title}
        description={fmt(t.description, { tz })}
        actions={
          <div className="flex items-center gap-3">
            <LiveRefresh businessId={owner.businessId} tables={["bookings"]} />
            <AddBooking services={(knowledge?.services ?? []).map((s) => s.name)} timeZone={tz} />
          </div>
        }
      />

      <nav aria-label={t.filter} className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Button key={v} variant={v === view ? "default" : "outline"} size="sm" asChild>
            <Link href={v === "upcoming" ? "/dashboard/bookings" : `/dashboard/bookings?view=${v}`} aria-current={v === view ? "page" : undefined}>
              {t.views[v]}
            </Link>
          </Button>
        ))}
      </nav>

      <Card className="py-0">
        <CardContent className="px-0">
          {error ? (
            <p role="alert" className="p-6 text-sm text-destructive">
              {t.loadFailed}
            </p>
          ) : bookings.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">{t.empty}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-4">{m.table.when}</TableHead>
                  <TableHead>{m.table.customer}</TableHead>
                  <TableHead>{m.table.service}</TableHead>
                  <TableHead>{m.table.status}</TableHead>
                  <TableHead>{m.table.source}</TableHead>
                  <TableHead className="pe-4">{m.table.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="ps-4 font-medium">{formatDateTime(b.date_time, tz, tf, locale)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {b.customer_name}
                        {b.conversations?.channel === "test" ? <Badge variant="outline">{m.common.test}</Badge> : null}
                      </div>
                      <div className="text-xs text-muted-foreground"><bdi dir="ltr">{b.phone_number}</bdi></div>
                      {b.notes ? <div className="max-w-56 truncate text-xs text-muted-foreground" title={b.notes}>{b.notes}</div> : null}
                    </TableCell>
                    <TableCell>{b.service_selected}</TableCell>
                    <TableCell>
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", STATUS_STYLES[b.status])}>{m.status[b.status]}</span>
                      {b.reminder_status === "sent" || b.reminder_status === "failed" ? (
                        <div className={cn("mt-1 text-xs", b.reminder_status === "sent" ? "text-muted-foreground" : "text-destructive")}>
                          🔔 {b.reminder_status === "sent" ? m.reminders.sent : m.reminders.failed}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {b.source === "ai" ? (
                        b.conversation_id ? (
                          <Link href={`/dashboard/conversations/${b.conversation_id}`} className="underline-offset-4 hover:underline">
                            {t.aiChat}
                          </Link>
                        ) : (
                          t.ai
                        )
                      ) : (
                        t.manual
                      )}
                    </TableCell>
                    <TableCell className="pe-4">
                      {b.status === "cancelled" ? (
                        <form action={deleteBooking}>
                          <input type="hidden" name="id" value={b.id} />
                          <Button type="submit" variant="ghost" size="sm" aria-label={fmt(t.deleteLabel, { name: b.customer_name })}>
                            <Trash2 /> {m.common.delete}
                          </Button>
                        </form>
                      ) : (
                        <StatusActions id={b.id} status={b.status} customer={b.customer_name} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {bookings.length === LIMIT ? <p className="mt-2 text-xs text-muted-foreground">{fmt(t.showingFirst, { n: LIMIT })}</p> : null}
    </>
  );
}
