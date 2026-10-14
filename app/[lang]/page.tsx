import Link from "next/link";
import {
  CalendarCheck,
  Check,
  Clock,
  Languages,
  LayoutDashboard,
  MessageCircle,
  Plug,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PrivacyLink } from "@/components/privacy-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { contactWhatsappLink, PLAN_NAMES, PLANS, PRICES_USD } from "@/lib/billing";
import { fmt } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { siteUrl, SOCIAL_LINKS } from "@/lib/site";
import { cn } from "@/lib/utils";

const FEATURE_ICONS: LucideIcon[] = [Clock, CalendarCheck, Languages, LayoutDashboard, Plug, ShieldCheck];

/** Public home page: what the product does, pricing, FAQ (static, one per language). */
export default async function Home({ params }: PageProps<"/[lang]">) {
  const locale = localeFrom((await params).lang);
  const m = getMessages(locale);
  const t = m.landing;
  const whatsapp = contactWhatsappLink(t.ctaWhatsapp);
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  // Structured data: tells search engines what ReplyBooker is, its prices and its social profiles.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: m.meta.appName,
        url: siteUrl(),
        email: "liibaan1257@gmail.com",
        sameAs: SOCIAL_LINKS.map((s) => s.url),
      },
      {
        "@type": "SoftwareApplication",
        name: m.meta.appName,
        url: siteUrl(),
        description: m.meta.description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: locale,
        offers: PLAN_NAMES.map((plan) => ({ "@type": "Offer", name: m.billing.plans[plan], price: PRICES_USD[plan], priceCurrency: "USD" })),
      },
    ],
  };

  return (
    <div className="flex flex-1 flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-brand/15 text-brand">
              <MessageCircle className="size-4" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">{m.meta.appName}</span>
          </Link>
          <nav className="ms-auto hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">{t.nav.features}</a>
            <a href="#pricing" className="hover:text-foreground">{t.nav.pricing}</a>
            <a href="#faq" className="hover:text-foreground">{t.nav.faq}</a>
          </nav>
          <div className="ms-auto flex items-center gap-2 md:ms-0">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">{m.home.signIn}</Link>
            </Button>
            <Button variant="brand" size="sm" asChild>
              <Link href="/signup">{m.home.getStarted}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
              <MessageCircle className="size-3.5" aria-hidden="true" />
              {t.badge}
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{t.heroTitle}</h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">{t.heroSubtitle}</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="brand" size="lg" asChild>
                <Link href="/signup">{t.ctaStart}</Link>
              </Button>
              {whatsapp ? (
                <Button variant="outline" size="lg" asChild>
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                    <MessageCircle aria-hidden="true" />
                    {t.ctaWhatsapp}
                  </a>
                </Button>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{t.noCard}</p>
          </div>
          <PhoneDemo demo={t.demo} />
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-16 border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="text-center text-3xl font-semibold tracking-tight">{t.featuresTitle}</h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {t.features.map((f, i) => {
                const Icon = FEATURE_ICONS[i] ?? Check;
                return (
                  <li key={f.title} className="rounded-xl border bg-card p-5">
                    <span className="grid size-10 place-items-center rounded-lg bg-brand/15 text-brand">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-center text-3xl font-semibold tracking-tight">{t.stepsTitle}</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {t.steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-semibold text-brand-foreground">{i + 1}</span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-16 border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight">{t.pricingTitle}</h2>
              <p className="mt-2 text-muted-foreground">{t.pricingSubtitle}</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {PLAN_NAMES.map((plan) => {
                const popular = plan === "starter";
                return (
                  <div key={plan} className={cn("flex flex-col rounded-xl border bg-card p-6", popular && "border-brand ring-1 ring-brand")}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold">{t.plans[plan].name}</h3>
                      {popular ? <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-brand-foreground">{t.popular}</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{t.plans[plan].desc}</p>
                    <p className="mt-5">
                      <span className="text-4xl font-semibold tabular-nums">{PRICES_USD[plan] ? money.format(PRICES_USD[plan]) : t.free}</span>
                      {PRICES_USD[plan] ? <span className="text-muted-foreground">{t.perMonth}</span> : null}
                    </p>
                    <ul className="mt-5 flex-1 space-y-2 text-sm">
                      {[fmt(t.repliesPerMonth, { n: PLANS[plan].replies.toLocaleString(locale) }), ...t.planFeatures].map((line) => (
                        <li key={line} className="flex items-start gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                          {line}
                        </li>
                      ))}
                    </ul>
                    <Button variant={popular ? "brand" : "outline"} className="mt-6" asChild>
                      <Link href="/signup">{t.choose}</Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-center text-3xl font-semibold tracking-tight">{t.faqTitle}</h2>
          <div className="mt-8 divide-y rounded-xl border bg-card">
            {t.faqs.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {f.q}
                    <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final call to action */}
        <section className="border-t bg-brand/10">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight">{t.finalTitle}</h2>
            <p className="mt-2 text-muted-foreground">{t.finalBody}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="brand" size="lg" asChild>
                <Link href="/signup">{t.ctaStart}</Link>
              </Button>
              {whatsapp ? (
                <Button variant="outline" size="lg" asChild>
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                    <MessageCircle aria-hidden="true" />
                    {t.ctaWhatsapp}
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <p>
            © {m.meta.appName}. {t.rights}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {SOCIAL_LINKS.map((s) => (
              <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer me" className="hover:text-foreground">
                {s.name}
              </a>
            ))}
            <PrivacyLink />
            <LanguageSwitcher className="w-40" />
            <ThemeToggle className="w-36" />
          </div>
        </div>
      </footer>
    </div>
  );
}

/** A WhatsApp-style conversation showing the agent answering and booking. */
function PhoneDemo({ demo }: { demo: { business: string; online: string; c1: string; a1: string; c2: string; a2: string; booked: string } }) {
  const bubble = "max-w-[85%] rounded-xl px-3.5 py-2 text-sm shadow-xs";
  return (
    <div className="mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="overflow-hidden rounded-[2rem] border-8 border-foreground/10 bg-card shadow-xl">
        <div className="flex items-center gap-3 bg-brand px-4 py-3 text-brand-foreground">
          <span className="grid size-9 place-items-center rounded-full bg-brand-foreground/20">
            <MessageCircle className="size-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{demo.business}</p>
            <p className="text-xs opacity-80">{demo.online}</p>
          </div>
        </div>
        <div className="space-y-3 bg-muted/40 p-4">
          <div className="flex justify-end">
            <p className={cn(bubble, "bg-brand/20")}>{demo.c1}</p>
          </div>
          <div className="flex justify-start">
            <p className={cn(bubble, "bg-background")}>{demo.a1}</p>
          </div>
          <div className="flex justify-end">
            <p className={cn(bubble, "bg-brand/20")}>{demo.c2}</p>
          </div>
          <div className="flex justify-start">
            <div className={cn(bubble, "bg-background")}>
              <p>{demo.a2}</p>
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
                <CalendarCheck className="size-3" />
                {demo.booked}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
