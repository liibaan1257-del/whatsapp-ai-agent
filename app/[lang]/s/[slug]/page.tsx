import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Clock, MessageCircle, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { DAYS } from "@/lib/knowledge";
import { chatLink, shopPath } from "@/lib/shop";
import { getShop, type Shop } from "@/lib/shop-data";

export async function generateMetadata({ params }: PageProps<"/[lang]/s/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShop(slug);
  if (!shop) return { robots: { index: false } };
  const description = shop.description.slice(0, 160) || shop.services.map((s) => s.name).join(", ").slice(0, 160);
  return {
    title: shop.name,
    description,
    alternates: { canonical: shopPath(slug) },
    openGraph: { type: "website", title: shop.name, description, url: shopPath(slug), images: [{ url: "/og-image.png", width: 1200, height: 630 }] },
  };
}

/** Public page for one business: what it sells, hours, and a WhatsApp button. */
export default function ShopPage({ params }: PageProps<"/[lang]/s/[slug]">) {
  // Any slug can exist, so params are read inside Suspense (rendered per request, cached per shop).
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-10 h-96 max-w-xl rounded-xl" />}>
      <ShopFromParams params={params} />
    </Suspense>
  );
}

async function ShopFromParams({ params }: { params: PageProps<"/[lang]/s/[slug]">["params"] }) {
  const { lang, slug } = await params;
  const locale = localeFrom(lang);
  return <ShopBody slug={slug} m={getMessages(locale)} locale={locale} />;
}

function time(hhmm: string, format: Shop["timeFormat"]): string {
  if (format === "24h") return hhmm;
  const [h, min] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

async function ShopBody({ slug, m, locale }: { slug: string; m: Messages; locale: string }) {
  const shop = await getShop(slug);
  if (!shop) notFound();
  const t = m.shop;
  const link = chatLink(shop.whatsapp, fmt(t.greeting, { name: shop.name }));
  const money = (p: string) => {
    const n = Number(p.replace(/[^\d.]/g, ""));
    return p && /^\s*[\d.,]+\s*$/.test(p) && Number.isFinite(n) ? new Intl.NumberFormat(locale, { style: "currency", currency: shop.currency, maximumFractionDigits: 2 }).format(n) : p;
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: shop.name,
    description: shop.description,
    url: shopPath(slug),
    telephone: `+${shop.whatsapp}`,
  };

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-xl space-y-6">
        <header className="rounded-2xl border bg-card p-6 text-center shadow-sm">
          {shop.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL logo
            <img src={shop.logo} alt="" className="mx-auto mb-4 size-20 rounded-2xl object-cover" />
          ) : (
            <div className="mx-auto mb-4 grid size-20 place-items-center rounded-2xl bg-brand text-3xl font-bold text-brand-foreground">{shop.name.slice(0, 1).toUpperCase()}</div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{shop.name}</h1>
          {shop.description ? <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{shop.description}</p> : null}
          <Button variant="brand" size="lg" className="mt-5 w-full" asChild>
            <a href={link} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" />
              {t.chatCta}
            </a>
          </Button>
        </header>

        {shop.services.length ? (
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Tag className="size-4 text-brand" aria-hidden="true" />
              {t.services}
            </h2>
            <ul className="divide-y">
              {shop.services.map((s) => (
                <li key={s.name} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    {s.description ? <p className="text-xs text-muted-foreground">{s.description}</p> : null}
                  </div>
                  {s.price ? <span className="shrink-0 font-semibold tabular-nums">{money(s.price)}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {Object.keys(shop.hours).length ? (
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Clock className="size-4 text-brand" aria-hidden="true" />
              {t.hours}
            </h2>
            <dl className="grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
              {DAYS.map((d) => {
                const h = shop.hours[d];
                return (
                  <div key={d} className="contents">
                    <dt className="text-muted-foreground">{m.days[d]}</dt>
                    <dd className="tabular-nums">{h ? `${time(h.open, shop.timeFormat)} – ${time(h.close, shop.timeFormat)}` : t.closed}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/" className="underline-offset-4 hover:underline">
            {t.poweredBy}
          </Link>
        </p>
      </div>
    </main>
  );
}
