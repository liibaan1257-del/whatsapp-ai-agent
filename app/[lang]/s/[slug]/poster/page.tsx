import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import QRCode from "qrcode";
import { PrintButton } from "@/components/shop/print-button";
import { fmt } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { chatLink, shopPath } from "@/lib/shop";
import { getShop } from "@/lib/shop-data";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Printable A4 poster: big QR that opens a WhatsApp chat with the business. */
export default function PosterPage({ params }: PageProps<"/[lang]/s/[slug]/poster">) {
  return (
    <Suspense fallback={null}>
      <PosterFromParams params={params} />
    </Suspense>
  );
}

async function PosterFromParams({ params }: { params: PageProps<"/[lang]/s/[slug]/poster">["params"] }) {
  const { lang, slug } = await params;
  return <Poster slug={slug} m={getMessages(localeFrom(lang))} />;
}

async function Poster({ slug, m }: { slug: string; m: Messages }) {
  const shop = await getShop(slug);
  if (!shop) notFound();
  const t = m.shop;
  const link = chatLink(shop.whatsapp, fmt(t.greeting, { name: shop.name }));
  const qr = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b3d2a", light: "#ffffff" } });
  const pageUrl = `${siteUrl().replace(/^https?:\/\//, "")}${shopPath(slug)}`;

  return (
    <main className="min-h-screen bg-white text-[#0b1f17]">
      <style>{"@page{size:A4;margin:0}@media print{.no-print{display:none}}"}</style>
      <div className="no-print flex justify-center gap-3 p-4">
        <PrintButton label={t.print} />
      </div>
      <div className="mx-auto flex aspect-[210/297] w-full max-w-[210mm] flex-col items-center justify-between border p-[14mm] text-center print:border-0">
        <div className="w-full">
          {shop.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL logo
            <img src={shop.logo} alt="" className="mx-auto mb-4 size-24 rounded-3xl object-cover" />
          ) : null}
          <h1 className="text-5xl font-black tracking-tight">{shop.name}</h1>
          <p className="mt-6 text-3xl font-bold text-[#0f6b45]">💬 {t.posterScan}</p>
        </div>
        <div className="w-[70%] rounded-3xl border-8 border-[#25d366] p-4" dangerouslySetInnerHTML={{ __html: qr }} />
        <div className="w-full">
          <p className="text-2xl font-semibold" dir="ltr">
            📲 +{shop.whatsapp}
          </p>
          <p className="mt-2 text-lg text-[#3d5a4d]">
            {t.posterOrVisit} <span dir="ltr">{pageUrl}</span>
          </p>
          <p className="mt-6 text-sm text-[#7a948a]">{t.poweredBy}</p>
        </div>
      </div>
    </main>
  );
}
