import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { LiveRefresh } from "@/components/dashboard/live-refresh";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/session";
import { setConversationStatus } from "@/lib/dashboard/actions";
import { getKnowledge } from "@/lib/dashboard/data";
import { formatDateTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard/conversations/[id]">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).conversation.title };
}

export default function ConversationPage({ params }: PageProps<"/[lang]/dashboard/conversations/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <Conversation params={params} />
    </Suspense>
  );
}

async function Conversation({ params }: { params: PageProps<"/[lang]/dashboard/conversations/[id]">["params"] }) {
  const { id, lang } = await params;
  const locale: Locale = localeFrom(lang);
  const t: Messages = getMessages(locale);
  const owner = await requireOwner(`/dashboard/conversations/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: conv }, { data: messages }, knowledge] = await Promise.all([
    supabase.from("conversations").select("id, channel, customer_phone, customer_name, status, is_lead").eq("id", id).maybeSingle(),
    supabase.from("messages").select("id, role, content, intent, created_at").eq("conversation_id", id).order("id").limit(500),
    getKnowledge(),
  ]);
  if (!conv) notFound(); // missing or another business's (RLS)
  const tz = knowledge?.timezone ?? "UTC";
  const tf = knowledge?.time_format ?? "24h";

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard">
          <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
          {t.conversation.back}
        </Link>
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{conv.customer_name || <bdi dir="ltr">{conv.customer_phone}</bdi>}</h1>
          <p className="text-sm text-muted-foreground">
            {conv.channel === "test" ? t.conversation.chatTester : <span dir="ltr">WhatsApp · {conv.customer_phone}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {conv.is_lead ? <Badge variant="brand">{t.common.lead}</Badge> : null}
          <LiveRefresh businessId={owner.businessId} tables={["messages"]} />
          <form action={setConversationStatus}>
            <input type="hidden" name="id" value={conv.id} />
            <input type="hidden" name="status" value={conv.status === "open" ? "closed" : "open"} />
            <Button type="submit" variant="outline" size="sm">
              {conv.status === "open" ? t.conversation.markClosed : t.conversation.reopen}
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3">
          {(messages ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{t.conversation.noMessages}</p> : null}
          {(messages ?? []).map((m) => (
            <div key={m.id} className={cn("flex", m.role === "customer" ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-3.5 py-2 text-sm whitespace-pre-wrap",
                  m.role === "customer" ? "bg-muted" : "bg-brand/15",
                )}
              >
                <span className="sr-only">{m.role === "customer" ? t.conversation.customer : t.conversation.agent} </span>
                {m.content}
                <span className="mt-1 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
                  {m.intent ? <span>{t.intent[m.intent as keyof Messages["intent"]] ?? m.intent}</span> : null}
                  {formatDateTime(m.created_at, tz, tf, locale)}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
