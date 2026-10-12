import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { contactEmail, contactWhatsapp } from "@/lib/contact";
import { fmt } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";

// Change when the terms change.
const UPDATED = "2026-10-12";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).terms.title };
}

export default async function TermsPage({ params }: PageProps<"/[lang]/terms">) {
  const locale = localeFrom((await params).lang);
  const m = getMessages(locale);
  const t = m.terms;
  const email = contactEmail();
  const whatsapp = contactWhatsapp();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${UPDATED}T00:00:00Z`));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {m.meta.appName}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{fmt(m.privacy.updated, { date })}</p>
      <p className="mt-6 leading-relaxed">{t.intro}</p>
      {t.sections.map((s) => (
        <section key={s.title} className="mt-8">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">{s.body}</p>
        </section>
      ))}
      <div className="mt-10 space-y-1 border-t pt-6 text-sm">
        {email ? (
          <p>
            {fmt(m.privacy.contact, { email: "" })}
            <a href={`mailto:${email}`} className="underline underline-offset-4" dir="ltr">
              {email}
            </a>
          </p>
        ) : null}
        {whatsapp ? (
          <p>
            <a href={whatsapp.link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              {m.common.whatsappContact}: <bdi dir="ltr">{whatsapp.display}</bdi>
            </a>
          </p>
        ) : null}
        <p>
          <Link href="/privacy" className="underline underline-offset-4">
            {m.common.privacy}
          </Link>
        </p>
      </div>
    </main>
  );
}
