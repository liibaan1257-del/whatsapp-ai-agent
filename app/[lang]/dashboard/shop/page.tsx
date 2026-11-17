import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Lock, Printer, QrCode, Store } from "lucide-react";
import QRCode from "qrcode";
import { PageHeader } from "@/components/dashboard/page-header";
import { ShopForm } from "@/components/shop/shop-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/session";
import { isActive } from "@/lib/billing";
import { fmt } from "@/lib/i18n/config";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { chatLink, shopPath, slugify } from "@/lib/shop";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard/shop">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).shop.title };
}

export default async function ShopSettingsPage({ params }: PageProps<"/[lang]/dashboard/shop">) {
  const m = getMessages(localeFrom((await params).lang));
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <ShopSettings m={m} />
    </Suspense>
  );
}

const qrSvg = (text: string) => QRCode.toString(text, { type: "svg", margin: 1, color: { dark: "#0b3d2a", light: "#ffffff" } });

async function ShopSettings({ m }: { m: Messages }) {
  const t = m.shop;
  const owner = await requireOwner("/dashboard/shop");
  if (!isActive(owner.accessUntil)) {
    return (
      <>
        <PageHeader title={t.title} description={t.description} />
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-5 text-brand" aria-hidden="true" />
              {t.lockedTitle}
            </CardTitle>
            <CardDescription>{t.lockedBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="brand" asChild>
              <Link href="/dashboard/settings#plan">{t.lockedCta}</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const { data } = await (await createClient())
    .from("business_knowledge")
    .select("business_name, public_slug, public_whatsapp, owner_whatsapp")
    .eq("id", owner.businessId)
    .maybeSingle();
  const name = String(data?.business_name || owner.businessName || "");
  const slug = (data?.public_slug as string | null) ?? slugify(name);
  const whatsapp = (data?.public_whatsapp as string | null) ?? (data?.owner_whatsapp as string | null) ?? "";
  const live = Boolean(data?.public_slug && data?.public_whatsapp);
  const url = live ? `${siteUrl()}${shopPath(String(data?.public_slug))}` : null;
  const [qrPage, qrChat] = live
    ? await Promise.all([qrSvg(url as string), qrSvg(chatLink(String(data?.public_whatsapp), fmt(t.greeting, { name })))])
    : [null, null];

  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="size-5 text-brand" aria-hidden="true" />
              {t.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ShopForm slug={slug} whatsapp={whatsapp ? `+${whatsapp}` : ""} url={url} />
          </CardContent>
        </Card>

        {live ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="size-5 text-brand" aria-hidden="true" />
                {t.posterTitle}
              </CardTitle>
              <CardDescription>{t.posterHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center text-xs text-muted-foreground">
                <figure>
                  <div className="mx-auto w-36 rounded-lg border bg-white p-2" dangerouslySetInnerHTML={{ __html: qrChat as string }} />
                  <figcaption className="mt-1">{t.qrWhatsapp}</figcaption>
                </figure>
                <figure>
                  <div className="mx-auto w-36 rounded-lg border bg-white p-2" dangerouslySetInnerHTML={{ __html: qrPage as string }} />
                  <figcaption className="mt-1">{t.qrPage}</figcaption>
                </figure>
              </div>
              <Button variant="brand" asChild>
                <a href={`${shopPath(String(data?.public_slug))}/poster`} target="_blank" rel="noopener noreferrer">
                  <Printer aria-hidden="true" />
                  {t.printPoster}
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
