import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ShoppingBag, Trash2 } from "lucide-react";
import { LiveRefresh } from "@/components/dashboard/live-refresh";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/session";
import { deleteOrder, setOrderStatus } from "@/lib/dashboard/order-actions";
import { formatDateTime } from "@/lib/format";
import { getKnowledge } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";
import { type Locale } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard/orders">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).orders.title };
}

const VIEWS = ["new", "done", "all"] as const;
type View = (typeof VIEWS)[number];
const LIMIT = 100;

type OrderItem = { name: string; quantity: number; unitPrice: number | null; lineTotal: number | null };
type OrderRow = {
  id: string;
  customer_name: string;
  phone_number: string;
  items: OrderItem[];
  total: number;
  currency: string;
  note: string;
  status: "new" | "done";
  created_at: string;
};

export default async function OrdersPage({ params, searchParams }: PageProps<"/[lang]/dashboard/orders">) {
  const locale = localeFrom((await params).lang);
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Orders searchParams={searchParams} locale={locale} m={getMessages(locale)} />
    </Suspense>
  );
}

function money(currency: string, n: number, locale: Locale): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

async function Orders({
  searchParams,
  locale,
  m,
}: {
  searchParams: PageProps<"/[lang]/dashboard/orders">["searchParams"];
  locale: Locale;
  m: Messages;
}) {
  const t = m.orders;
  const owner = await requireOwner("/dashboard/orders");
  const params = await searchParams;
  const view: View = typeof params.view === "string" && (VIEWS as readonly string[]).includes(params.view) ? (params.view as View) : "new";
  const knowledge = await getKnowledge();
  const tz = knowledge?.timezone ?? "UTC";
  const tf = knowledge?.time_format ?? "24h";

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("id, customer_name, phone_number, items, total, currency, note, status, created_at")
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (view !== "all") query = query.eq("status", view);
  const { data } = await query;
  const orders = (data ?? []) as OrderRow[];

  const tabs: { view: View; label: string }[] = [
    { view: "new", label: t.viewNew },
    { view: "done", label: t.viewDone },
    { view: "all", label: t.viewAll },
  ];

  return (
    <div className="space-y-6">
      <LiveRefresh businessId={owner.businessId} tables={["orders"]} />
      <PageHeader title={t.title} description={t.subtitle} />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button key={tab.view} variant={tab.view === view ? "default" : "outline"} size="sm" asChild>
            <Link href={`/dashboard/orders?view=${tab.view}`}>{tab.label}</Link>
          </Button>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <ShoppingBag className="size-8" aria-hidden="true" />
            <p>{t.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {orders.map((o) => (
            <Card key={o.id} className={cn(o.status === "done" && "opacity-70")}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{o.customer_name || "—"}</p>
                    {o.phone_number ? (
                      <a href={`https://wa.me/${o.phone_number.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" className="text-sm text-brand underline-offset-4 hover:underline">
                        +{o.phone_number.replace(/^\+/, "")}
                      </a>
                    ) : null}
                  </div>
                  <Badge variant={o.status === "new" ? "default" : "secondary"}>{o.status === "new" ? t.statusNew : t.statusDone}</Badge>
                </div>

                <ul className="space-y-1 text-sm">
                  {o.items.map((it, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>
                        {it.quantity} × {it.name}
                      </span>
                      {it.lineTotal != null ? <span className="tabular-nums text-muted-foreground">{money(o.currency, it.lineTotal, locale)}</span> : null}
                    </li>
                  ))}
                </ul>

                {o.total > 0 ? (
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>{t.total}</span>
                    <span className="tabular-nums">{money(o.currency, o.total, locale)}</span>
                  </div>
                ) : null}

                {o.note ? (
                  <p className="text-sm text-muted-foreground">
                    {t.note}: {o.note}
                  </p>
                ) : null}

                <p className="text-xs text-muted-foreground">{formatDateTime(o.created_at, tz, tf)}</p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {o.status === "new" ? (
                    <form action={setOrderStatus}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="status" value="done" />
                      <Button type="submit" size="sm" variant="brand">
                        {t.markDone}
                      </Button>
                    </form>
                  ) : (
                    <form action={setOrderStatus}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="status" value="new" />
                      <Button type="submit" size="sm" variant="outline">
                        {t.markNew}
                      </Button>
                    </form>
                  )}
                  <form action={deleteOrder}>
                    <input type="hidden" name="id" value={o.id} />
                    <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                      <Trash2 className="size-4" aria-hidden="true" />
                      <span className="sr-only">{t.delete}</span>
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
