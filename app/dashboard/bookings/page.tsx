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
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Bookings" };

const VIEWS = {
  upcoming: "Upcoming",
  pending: "Needs confirmation",
  past: "Past",
  all: "All",
} as const;
type View = keyof typeof VIEWS;
const LIMIT = 100;

export default function BookingsPage({ searchParams }: PageProps<"/dashboard/bookings">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Bookings searchParams={searchParams} />
    </Suspense>
  );
}

async function Bookings({ searchParams }: { searchParams: PageProps<"/dashboard/bookings">["searchParams"] }) {
  const owner = await requireOwner("/dashboard/bookings");
  const params = await searchParams;
  const view: View = typeof params.view === "string" && params.view in VIEWS ? (params.view as View) : "upcoming";
  const knowledge = await getKnowledge();
  const tz = knowledge?.timezone ?? "UTC";
  const tf = knowledge?.time_format ?? "24h";
  const now = new Date().toISOString();

  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("id, conversation_id, customer_name, phone_number, service_selected, date_time, status, notes, source, created_at, conversations(channel)");
  if (view === "upcoming") query = query.gte("date_time", now).in("status", ["pending", "confirmed"]).order("date_time");
  else if (view === "pending") query = query.eq("status", "pending").order("date_time");
  else if (view === "past") query = query.lt("date_time", now).order("date_time", { ascending: false });
  else query = query.order("date_time", { ascending: false });
  const { data, error } = await query.limit(LIMIT);
  const bookings = (data ?? []) as unknown as BookingRow[];

  return (
    <>
      <PageHeader
        title="Bookings"
        description={`Appointments captured by your AI agent or added by you. Times in ${tz}.`}
        actions={
          <div className="flex items-center gap-3">
            <LiveRefresh businessId={owner.businessId} tables={["bookings"]} />
            <AddBooking services={(knowledge?.services ?? []).map((s) => s.name)} timeZone={tz} />
          </div>
        }
      />

      <nav aria-label="Filter bookings" className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <Button key={v} variant={v === view ? "default" : "outline"} size="sm" asChild>
            <Link href={v === "upcoming" ? "/dashboard/bookings" : `/dashboard/bookings?view=${v}`} aria-current={v === view ? "page" : undefined}>
              {VIEWS[v]}
            </Link>
          </Button>
        ))}
      </nav>

      <Card className="py-0">
        <CardContent className="px-0">
          {error ? (
            <p role="alert" className="p-6 text-sm text-destructive">
              Couldn&apos;t load bookings.
            </p>
          ) : bookings.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No bookings here yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">When</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="pl-4 font-medium">{formatDateTime(b.date_time, tz, tf)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {b.customer_name}
                        {b.conversations?.channel === "test" ? <Badge variant="outline">Test</Badge> : null}
                      </div>
                      <div className="text-xs text-muted-foreground">{b.phone_number}</div>
                      {b.notes ? <div className="max-w-56 truncate text-xs text-muted-foreground" title={b.notes}>{b.notes}</div> : null}
                    </TableCell>
                    <TableCell>{b.service_selected}</TableCell>
                    <TableCell>
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium capitalize", STATUS_STYLES[b.status])}>{b.status}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {b.source === "ai" ? (
                        b.conversation_id ? (
                          <Link href={`/dashboard/conversations/${b.conversation_id}`} className="underline-offset-4 hover:underline">
                            AI chat
                          </Link>
                        ) : (
                          "AI"
                        )
                      ) : (
                        "Manual"
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      {b.status === "cancelled" ? (
                        <form action={deleteBooking}>
                          <input type="hidden" name="id" value={b.id} />
                          <Button type="submit" variant="ghost" size="sm" aria-label={`Delete cancelled booking for ${b.customer_name}`}>
                            <Trash2 /> Delete
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
      {bookings.length === LIMIT ? <p className="mt-2 text-xs text-muted-foreground">Showing the first {LIMIT}.</p> : null}
    </>
  );
}
