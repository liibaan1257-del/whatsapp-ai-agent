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
import { formatDateTime, STATUS_STYLES, timeAgo } from "@/lib/format";
import { fmt, type Locale } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).overview.title };
}

export default async function OverviewPage({ params }: PageProps<"/[lang]/dashboard">) {
  const locale = localeFrom((await params).lang);
  const m = getMessages(locale);
  return (
    <Suspense fallback={<OverviewSkeleton label={m.overview.loadingOverview} />}>
      <Overview locale={locale} m={m} />
    </Suspense>
  );
}

async function Overview({ locale, m }: { locale: Locale; m: Messages }) {
  const o = m.overview;
  const owner = await requireOwner("/dashboard");
  const [{ stats, conversations, bookings }, knowledge] = await Promise.all([getOverview(), getKnowledge()]);
  const tz = knowledge?.timezone ?? "UTC";
  const tf = knowledge?.time_format ?? "24h";
  const config = configStatus();

  const setup = [
    { done: Boolean(knowledge?.business_name), label: o.setupName, href: "/dashboard/knowledge" },
    { done: Boolean(knowledge?.services.length), label: o.setupServices, href: "/dashboard/knowledge" },
    { done: Boolean(knowledge && Object.values(knowledge.working_hours).some(Boolean)), label: o.setupHours, href: "/dashboard/knowledge" },
    { done: config.ai, label: o.setupAi, href: null },
    { done: Boolean(knowledge?.whatsapp_phone_number_id) && config.whatsappWebhook && config.whatsappSend, label: o.setupWhatsapp, href: "/dashboard/knowledge" },
  ];
  const setupDone = setup.every((s) => s.done);

  const cards = [
    { label: o.activeConversations, value: stats.openConversations, hint: o.activeHint, icon: MessagesSquare },
    { label: o.leads, value: stats.leads, hint: o.leadsHint, icon: Sparkles },
    { label: o.upcoming, value: stats.upcomingBookings, hint: o.upcomingHint, icon: CalendarCheck },
    { label: o.needConfirmation, value: stats.pendingBookings, hint: o.needConfirmationHint, icon: CalendarClock },
  ];

  return (
    <>
      <PageHeader
        title={o.title}
        description={owner.fullName ? fmt(o.greeting, { name: owner.fullName }) : o.greetingNoName}
        actions={<LiveRefresh businessId={owner.businessId} tables={["conversations", "messages", "bookings"]} />}
      />

      {!setupDone ? (
        <Card className="mb-6 border-brand/30">
          <CardHeader>
            <CardTitle>{o.finishSetup}</CardTitle>
            <CardDescription>{o.finishSetupHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {setup.map((s) => (
                <li key={s.label} className="flex items-center gap-2 text-sm">
                  {s.done ? <CircleCheck className="size-4 text-brand" aria-label={m.common.done} /> : <Circle className="size-4 text-muted-foreground" aria-label={m.common.toDo} />}
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
            <CardTitle>{o.upcoming}</CardTitle>
            <CardDescription>{fmt(o.timesIn, { tz })}</CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/bookings">{o.allBookings}</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{o.noUpcoming}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.table.when}</TableHead>
                    <TableHead>{m.table.customer}</TableHead>
                    <TableHead>{m.table.service}</TableHead>
                    <TableHead>{m.table.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{formatDateTime(b.date_time, tz, tf, locale)}</TableCell>
                      <TableCell>
                        {b.customer_name}
                        {b.conversations?.channel === "test" ? (
                          <Badge variant="outline" className="ms-2">
                            {m.common.test}
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>{b.service_selected}</TableCell>
                      <TableCell>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[b.status]}`}>{m.status[b.status]}</span>
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
            <CardTitle>{o.recent}</CardTitle>
            <CardDescription>{o.recentHint}</CardDescription>
          </CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                <Link href="/dashboard/chat-test" className="underline-offset-4 hover:underline">
                  {o.noConversations}
                </Link>
              </p>
            ) : (
              <ul className="divide-y">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <Link href={`/dashboard/conversations/${c.id}`} className="flex items-start gap-3 rounded-md px-2 py-3 hover:bg-muted/60">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium">{c.customer_name || <bdi dir="ltr">{c.customer_phone}</bdi>}</span>
                          {c.channel === "test" ? <Badge variant="outline">{m.common.test}</Badge> : null}
                          {c.is_lead ? <Badge variant="brand">{m.common.lead}</Badge> : null}
                          {c.last_intent ? <Badge variant="secondary">{m.intent[c.last_intent as keyof Messages["intent"]] ?? c.last_intent}</Badge> : null}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">{c.last_message ?? ""}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(c.last_message_at, locale)}</span>
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

function OverviewSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={label}>
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
