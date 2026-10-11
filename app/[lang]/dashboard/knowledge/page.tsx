import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { KnowledgeForm } from "@/components/knowledge/knowledge-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/session";
import { getKnowledge } from "@/lib/dashboard/data";
import { configStatus } from "@/lib/env";
import type { Locale } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard/knowledge">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).knowledge.title };
}

export default async function KnowledgePage({ params }: PageProps<"/[lang]/dashboard/knowledge">) {
  const locale = localeFrom((await params).lang);
  const m = getMessages(locale);
  return (
    <>
      <PageHeader title={m.knowledge.title} description={m.knowledge.description} />
      <Suspense fallback={<Skeleton className="h-[600px] rounded-xl" />}>
        <KnowledgeEditor locale={locale} m={m} />
      </Suspense>
    </>
  );
}

async function KnowledgeEditor({ locale, m }: { locale: Locale; m: Messages }) {
  await requireOwner("/dashboard/knowledge");
  const knowledge = await getKnowledge();
  if (!knowledge) return <p className="text-sm text-muted-foreground">{m.knowledge.missing}</p>;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "your-app.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  // Server-side list so server and browser render the same options.
  const zones = Intl.supportedValuesOf("timeZone");
  const timeZones = zones.includes(knowledge.timezone) ? zones : [knowledge.timezone, ...zones];
  const names = new Intl.DisplayNames([locale, "en"], { type: "currency" });
  const codes = Intl.supportedValuesOf("currency");
  const currencies = (codes.includes(knowledge.currency) ? codes : [knowledge.currency, ...codes]).map((code) => ({
    code,
    label: `${code} – ${names.of(code) ?? code}`,
  }));
  const { ai, whatsappWebhook, whatsappSend, serviceRole, twilio } = configStatus();

  return (
    <KnowledgeForm
      initial={knowledge}
      timeZones={timeZones}
      currencies={currencies}
      webhookUrl={`${proto}://${host}/api/whatsapp/webhook`}
      twilioWebhookUrl={`${proto}://${host}/api/whatsapp/twilio`}
      status={{ ai, whatsappWebhook, whatsappSend, serviceRole, twilio }}
    />
  );
}
