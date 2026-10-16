import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, Check, MessageCircle } from "lucide-react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { fmt, LOCALES } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { INDUSTRIES, isIndustry } from "@/lib/industries";
import { demoWhatsappLink, siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => INDUSTRIES.map((industry) => ({ lang, industry })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/for/[industry]">): Promise<Metadata> {
  const { lang, industry } = await params;
  if (!isIndustry(industry)) return {};
  const m = getMessages(localeFrom(lang));
  const vars = { plural: m.industries.list[industry].plural };
  const title = fmt(m.industries.title, vars);
  const description = fmt(m.industries.description, vars);
  return {
    title,
    description,
    alternates: { canonical: `/for/${industry}` },
    openGraph: {
      type: "website",
      siteName: m.meta.appName,
      title,
      description,
      url: `/for/${industry}`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: m.meta.appName }],
    },
  };
}

/** Landing page for one type of business (salons, clinics, …), static per language. */
export default async function IndustryPage({ params }: PageProps<"/[lang]/for/[industry]">) {
  const { lang, industry } = await params;
  if (!isIndustry(industry)) notFound();
  const locale = localeFrom(lang);
  const m = getMessages(locale);
  const t = m.industries;
  const item = t.list[industry];
  const vars = { plural: item.plural, service: item.service };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: fmt(t.title, vars),
    description: fmt(t.description, vars),
    url: `${siteUrl()}/for/${industry}`,
    provider: { "@type": "Organization", name: m.meta.appName, url: siteUrl() },
    areaServed: "Worldwide",
    audience: { "@type": "BusinessAudience", name: item.name },
  };

  return (
    <div className="flex flex-1 flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader m={m} />
      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
              <MessageCircle className="size-3.5" aria-hidden="true" />
              {fmt(t.badge, vars)}
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{fmt(t.title, vars)}</h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">{t.heroSubtitle}</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="brand" size="lg" asChild>
                <Link href="/signup">{m.landing.ctaStart}</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href={demoWhatsappLink(item.c1)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden="true" />
                  {m.landing.tryDemo}
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{m.landing.noCard}</p>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <p className="mb-3 text-center text-sm font-medium text-muted-foreground">{t.exampleTitle}</p>
            <div className="overflow-hidden rounded-[2rem] border-8 border-foreground/10 bg-card shadow-xl" aria-hidden="true">
              <div className="flex items-center gap-3 bg-brand px-4 py-3 text-brand-foreground">
                <span className="grid size-9 place-items-center rounded-full bg-brand-foreground/20">
                  <MessageCircle className="size-4" />
                </span>
                <p className="text-sm font-semibold">{item.name}</p>
              </div>
              <div className="space-y-3 bg-muted/40 p-4 text-sm">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-xl bg-brand/20 px-3.5 py-2 shadow-xs">{item.c1}</p>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl bg-background px-3.5 py-2 shadow-xs">
                    <p>{item.a1}</p>
                    <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
                      <CalendarCheck className="size-3" />
                      {m.landing.demo.booked}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight">{fmt(t.benefitsTitle, vars)}</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {t.benefits.map((b) => (
                <li key={b} className="rounded-xl border bg-card p-5 text-sm">
                  <Check className="mb-2 size-5 text-brand" aria-hidden="true" />
                  {fmt(b, vars)}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h2 className="text-lg font-semibold">{t.otherTitle}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {INDUSTRIES.filter((s) => s !== industry).map((s) => (
              <li key={s}>
                <Link href={`/for/${s}`} className="inline-block rounded-full border px-3 py-1 text-sm hover:bg-muted">
                  {t.list[s].name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t bg-brand/10">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight">{t.ctaTitle}</h2>
            <p className="mt-2 text-muted-foreground">{m.landing.finalBody}</p>
            <div className="mt-6 flex justify-center">
              <Button variant="brand" size="lg" asChild>
                <Link href="/signup">{m.landing.ctaStart}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter m={m} />
    </div>
  );
}
