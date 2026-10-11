import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { contactEmail, contactWhatsapp } from "@/lib/contact";
import { fmt } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";

// Change when the policy text changes.
const UPDATED = "2026-10-11";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).privacy.title };
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const locale = localeFrom((await params).lang);
  const m = getMessages(locale);
  const p = m.privacy;
  // The operator's contact address (public, set in Vercel). Optional.
  const contact = contactEmail();
  const whatsapp = contactWhatsapp();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${UPDATED}T00:00:00Z`));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {m.meta.appName}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">{p.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{fmt(p.updated, { date })}</p>
      <p className="mt-6 leading-relaxed">{p.intro}</p>
      {p.sections.map((s) => (
        <section key={s.title} className="mt-8">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">{s.body}</p>
        </section>
      ))}
      <p className="mt-10 border-t pt-6 text-sm">
        {contact ? (
          <>
            {fmt(p.contact, { email: "" })}
            <a href={`mailto:${contact}`} className="underline underline-offset-4" dir="ltr">
              {contact}
            </a>
          </>
        ) : whatsapp ? null : (
          p.contactFallback
        )}
        {whatsapp ? (
          <a href={whatsapp.link} target="_blank" rel="noopener noreferrer" className="mt-2 block underline underline-offset-4">
            {m.common.whatsappContact}: <bdi dir="ltr">{whatsapp.display}</bdi>
          </a>
        ) : null}
      </p>
    </main>
  );
}
