import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Check, MessageCircle } from "lucide-react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/i18n/dictionaries";
import { siteUrl } from "@/lib/site";
import { ENGLISH_LINKS, SOMALI_LINKS, SOMALI_PAGES, SOMALI_STEPS, type SomaliPage, type SomaliPageSlug } from "@/lib/somali-pages";

/** Metadata for a Somali landing page: one Somali page at one canonical URL, whatever the visitor's language. */
export function somaliPageMetadata(slug: SomaliPageSlug): Metadata {
  const p: SomaliPage = SOMALI_PAGES[slug];
  return {
    title: p.title,
    description: p.description,
    alternates: {
      canonical: p.path,
      ...(p.alternate ? { languages: { [p.lang ?? "so"]: p.path, [p.alternate.lang]: p.alternate.path } } : {}),
    },
    openGraph: {
      type: "website",
      siteName: "ReplyBooker",
      locale: p.lang === "en" ? "en_US" : "so_SO",
      title: p.title,
      description: p.description,
      url: p.path,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ReplyBooker" }],
    },
  };
}

/** A Somali landing page built from lib/somali-pages.ts (header and footer in Somali too). */
export function SomaliLanding({ slug }: { slug: SomaliPageSlug }) {
  const p: SomaliPage = SOMALI_PAGES[slug];
  const lang = p.lang ?? "so";
  const en = lang === "en";
  const m = getMessages(lang);
  const steps = p.steps ?? SOMALI_STEPS;
  const url = `${siteUrl()}${p.path}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: p.title,
      description: p.description,
      url,
      inLanguage: lang,
      provider: { "@type": "Organization", name: "ReplyBooker", url: siteUrl() },
      availableLanguage: ["so", "en", "ar"],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: p.stepsTitle,
      inLanguage: lang,
      step: steps.map((st, i) => ({ "@type": "HowToStep", position: i + 1, name: st.title, text: st.text })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: lang,
      mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
  const related = (en ? ENGLISH_LINKS : SOMALI_LINKS).filter((l) => l.path !== p.path);

  return (
    <div className="flex flex-1 flex-col" lang={lang}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader m={m} />
      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
              <MessageCircle className="size-3.5" aria-hidden="true" />
              {p.kicker}
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{p.title}</h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">{p.intro}</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="brand" size="lg" asChild>
                <Link href="/signup">{m.landing.ctaStart}</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{m.landing.noCard}</p>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <p className="mb-3 text-center text-sm font-medium text-muted-foreground">{p.chatLabel}</p>
            <div className="overflow-hidden rounded-[2rem] border-8 border-foreground/10 bg-card shadow-xl" aria-hidden="true">
              <div className="flex items-center gap-3 bg-brand px-4 py-3 text-brand-foreground">
                <span className="grid size-9 place-items-center rounded-full bg-brand-foreground/20">
                  <MessageCircle className="size-4" />
                </span>
                <p className="text-sm font-semibold">{p.chatName}</p>
              </div>
              <div className="space-y-3 bg-muted/40 p-4 text-sm">
                {p.chat.map((c, i) => (
                  <div key={i} className={c.from === "customer" ? "flex justify-end" : "flex justify-start"}>
                    <div className={c.from === "customer" ? "max-w-[85%] rounded-xl bg-brand/20 px-3.5 py-2 shadow-xs" : "max-w-[85%] rounded-xl bg-background px-3.5 py-2 shadow-xs"}>
                      <p>{c.text}</p>
                      {c.booked ? (
                        <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
                          <CalendarCheck className="size-3" />
                          {m.landing.demo.booked}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight">{p.benefitsTitle}</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {p.benefits.map((b) => (
                <li key={b} className="rounded-xl border bg-card p-5 text-sm">
                  <Check className="mb-2 size-5 text-brand" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">{p.stepsTitle}</h2>
          <p className="mt-2 text-center text-muted-foreground">{en ? "4 steps, no code." : "4 tallaabo, code la\u2019aan."}</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {steps.map((st, i) => (
              <li key={st.title} className="flex gap-4 rounded-xl border bg-card p-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-semibold text-brand-foreground">{i + 1}</span>
                <div>
                  <h3 className="font-semibold">{st.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{st.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight">{en ? "Frequently asked questions" : "Su\u2019aalaha badanaa la is weydiiyo"}</h2>
            <div className="mt-8 space-y-3">
              {p.faq.map((f) => (
                <details key={f.q} className="rounded-xl border bg-card p-5">
                  <summary className="cursor-pointer font-medium">{f.q}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {p.alternate || related.length ? (
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="text-xl font-semibold tracking-tight">{en ? "Also available" : "Bogag kale oo Af-Soomaali ah"}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {p.alternate && en ? (
              <li>
                <Link href={p.alternate.path} lang="so" className="inline-block rounded-full border px-3 py-1 text-sm hover:border-brand hover:text-brand">
                  Af-Soomaali: Buugga Deynta
                </Link>
              </li>
            ) : null}
            {related.map((l) => (
              <li key={l.path}>
                <Link href={l.path} className="inline-block rounded-full border px-3 py-1 text-sm hover:border-brand hover:text-brand">
                  {l.label}
                </Link>
              </li>
            ))}
            {p.alternate && !en ? (
              <li>
                <Link href={p.alternate.path} lang="en" className="inline-block rounded-full border px-3 py-1 text-sm hover:border-brand hover:text-brand">
                  English: Debt book app
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
        ) : null}

        <section className="border-t bg-brand/10">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight">{en ? "Start today · 7-day money-back guarantee" : "Maanta bilow · dammaanad 7 maalmood"}</h2>
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
