import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { KnowledgeForm } from "@/components/knowledge/knowledge-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/session";
import { getKnowledge } from "@/lib/dashboard/data";
import { configStatus } from "@/lib/env";

export const metadata: Metadata = { title: "Knowledge base" };

export default function KnowledgePage() {
  return (
    <>
      <PageHeader title="Knowledge base" description="Everything your AI agent knows about your business. It reads this before every reply." />
      <Suspense fallback={<Skeleton className="h-[600px] rounded-xl" />}>
        <KnowledgeEditor />
      </Suspense>
    </>
  );
}

async function KnowledgeEditor() {
  await requireOwner("/dashboard/knowledge");
  const knowledge = await getKnowledge();
  if (!knowledge) return <p className="text-sm text-muted-foreground">Your business record is missing. Run the database migration.</p>;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "your-app.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  // Server-side list so server and browser render the same options.
  const zones = Intl.supportedValuesOf("timeZone");
  const timeZones = zones.includes(knowledge.timezone) ? zones : [knowledge.timezone, ...zones];
  const names = new Intl.DisplayNames(["en"], { type: "currency" });
  const codes = Intl.supportedValuesOf("currency");
  const currencies = (codes.includes(knowledge.currency) ? codes : [knowledge.currency, ...codes]).map((code) => ({
    code,
    label: `${code} – ${names.of(code) ?? code}`,
  }));
  const { ai, whatsappWebhook, whatsappSend, serviceRole } = configStatus();

  return (
    <KnowledgeForm
      initial={knowledge}
      timeZones={timeZones}
      currencies={currencies}
      webhookUrl={`${proto}://${host}/api/whatsapp/webhook`}
      status={{ ai, whatsappWebhook, whatsappSend, serviceRole }}
    />
  );
}
