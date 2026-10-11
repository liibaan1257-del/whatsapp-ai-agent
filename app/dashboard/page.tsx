import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarClock, CalendarCheck, CircleCheck, Circle, MessagesSquare, Sparkles } from "lucide-react";
import { LiveRefresh } from "@/components/dashboard/live-refresh";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOwner } from "@/lib/auth/session";
import { getKnowledge, getOverview } from "@/lib/dashboard/data";
import { configStatus } from "@/lib/env";
import { formatDateTime, INTENT_LABELS, STATUS_STYLES, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const owner = await requireOwner("/dashboard");
  const [{ stats, conversations, bookings }, knowledge] = await Promise.all([getOverview(), getKnowledge()]);
  const tz = knowledge?.timezone ?? "UTC";
  const tf = knowledge?.time_format ?? "24h";
  const config = configStatus();

  const setup = [
    { done: Boolean(knowledge?.business_name), label: "Name your business", href: "/dashboard/knowledge" },
    { done: Boolean(knowledge?.services.length), label: "Add services and prices", href: "/dashboard/knowledge" },
    { done: Boolean(knowledge && Object.values(knowledge.working_hours).some(Boolean)), label: "Set opening hours", href: "/dashboard/knowledge" },
    { done: config.ai, label: "AI key configured (ANTHROPIC_API_KEY)", href: null },
    { done: Boolean(knowledge?.whatsapp_phone_number_id) && config.whatsappWebhook && config.whatsappSend, label: "Connect WhatsApp", href: "/dashboard/knowledge" },
  ];
  const setupDone = setup.every((s) => s.done);

  const cards = [
    { label: "Active conversations", value: stats.openConversations, hint: "WhatsApp, last 7 days", icon: MessagesSquare },
    { label: "Leads", value: stats.leads, hint: "asked about prices or booking, 30 days", icon: Sparkles },
    { label: "Upcoming bookings", value: stats.upcomingBookings, hint: "pending + confirmed", icon: CalendarCheck },
    { label: "Need confirmation", value: stats.pendingBookings, hint: "pending bookings", icon: CalendarClock },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Hi${owner.fullName ? ` ${owner.fullName}` : ""}, here's what your AI agent has been doing.`}
        actions={<LiveRefresh businessId={owner.businessId} tables={["conversations", "messages", "bookings"]} />}
      />

      {!setupDone ? (
        <Card className="mb-6 border-brand/30">
          <CardHeader>
            <CardTitle>Finish setting up</CardTitle>
            <CardDescription>The agent answers better the more it knows about your business.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {setup.map((s) => (
                <li key={s.label} className="flex items-center gap-2 text-sm">
                  {s.done ? <CircleCheck className="size-4 text-brand" aria-label="Done" /> : <Circle className="size-4 text-muted-foreground" aria-label="To do" />}
                  {s.href && !s.done ? (
                    <Link href={s.href} className="underline-offset-4 hover:underline">
                      {s.label}
                    </Link>
                  ) : (
                    <span className={s.done ? "text-muted-foreground" : ""}>{s.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label} className="gap-2 py-4">
            <CardHeader className="px-4">
              <CardDescription className="flex items-center gap-2">
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-3xl font-semibold tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Upcoming bookings</CardTitle>
            <CardDescription>Times in {tz}</CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/bookings">All bookings</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No upcoming bookings yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{formatDateTime(b.date_time, tz, tf)}</TableCell>
                      <TableCell>
                        {b.customer_name}
                        {b.conversations?.channel === "test" ? (
                          <Badge variant="outline" className="ml-2">
                            Test
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>{b.service_selected}</TableCell>
                      <TableCell>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[b.status]}`}>{b.status}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Recent conversations</CardTitle>
            <CardDescription>Latest WhatsApp and test chats</CardDescription>
          </CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No conversations yet. Try the{" "}
                <Link href="/dashboard/chat-test" className="underline underline-offset-4">
                  chat tester
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <Link href={`/dashboard/conversations/${c.id}`} className="flex items-start gap-3 rounded-md px-2 py-3 hover:bg-muted/60">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium">{c.customer_name || c.customer_phone}</span>
                          {c.channel === "test" ? <Badge variant="outline">Test</Badge> : null}
                          {c.is_lead ? <Badge variant="brand">Lead</Badge> : null}
                          {c.last_intent ? <Badge variant="secondary">{INTENT_LABELS[c.last_intent] ?? c.last_intent}</Badge> : null}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">{c.last_message ?? ""}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(c.last_message_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading overview">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
