import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatTester, type TestMessage } from "@/components/chat-test/chat-tester";
import { PageHeader } from "@/components/dashboard/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/session";
import { testPhoneFor } from "@/lib/dashboard/chat-test";
import { getMessages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard/chat-test">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).chat.title };
}

export default async function ChatTestPage({ params }: PageProps<"/[lang]/dashboard/chat-test">) {
  const m = getMessages(localeFrom((await params).lang));
  return (
    <>
      <PageHeader title={m.chat.title} description={m.chat.description} />
      <Suspense fallback={<Skeleton className="h-[480px] rounded-xl" />}>
        <Tester />
      </Suspense>
    </>
  );
}

async function Tester() {
  const owner = await requireOwner("/dashboard/chat-test");
  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("channel", "test")
    .eq("customer_phone", testPhoneFor(owner.id))
    .maybeSingle();

  let initial: TestMessage[] = [];
  if (conv) {
    const [{ data: msgs }, { data: bookings }] = await Promise.all([
      supabase.from("messages").select("id, role, content, intent, created_at").eq("conversation_id", conv.id).order("id").limit(200),
      supabase.from("bookings").select("id, created_at").eq("conversation_id", conv.id),
    ]);
    initial = (msgs ?? []).map((m) => ({ id: String(m.id), role: m.role, content: m.content, intent: m.intent }));
    // Mark the reply right after each booking was created.
    for (const b of bookings ?? []) {
      const idx = (msgs ?? []).findIndex((m) => m.role === "assistant" && m.created_at >= b.created_at);
      if (idx >= 0) initial[idx].bookingId = b.id;
    }
  }
  return <ChatTester key={conv?.id ?? "new"} initial={initial} businessName={owner.businessName} />;
}
