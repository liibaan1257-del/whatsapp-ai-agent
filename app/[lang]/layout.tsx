import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleTag } from "@/components/analytics/google-tag";
import { PageTracker } from "@/components/analytics/page-tracker";
import { I18nProvider } from "@/components/i18n/provider";
import { dirOf, LOCALES } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import "../globals.css";

// Only the Latin subset is preloaded (covers en/so/fr/es/de/sw). Other scripts
// (Cyrillic, Arabic, Chinese) use the system font, so the first paint doesn't
// wait on extra font files.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// Mono is only used below the fold: no preload.
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], preload: false });

// One static version per language; proxy.ts picks it from the `lang` cookie / browser.
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const m = getMessages(localeFrom((await params).lang));
  return {
    title: { default: m.meta.appName, template: `%s · ${m.meta.appName}` },
    description: m.meta.description,
    metadataBase: new URL(siteUrl()),
    openGraph: {
      type: "website",
      siteName: m.meta.appName,
      title: m.meta.appName,
      description: m.meta.description,
      url: "/",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: m.meta.appName }],
    },
    twitter: { card: "summary_large_image", images: ["/og-image.png"] },
    // Meta Business domain verification for replybooker.com (public by design).
    other: { "facebook-domain-verification": "pc3dkwilcn9momtcrhk0nugk9a8vmj" },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const locale = localeFrom((await params).lang);
  return (
    // suppressHydrationWarning: THEME_SCRIPT adds the "dark" class before React loads.
    <html lang={locale} dir={dirOf(locale)} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <I18nProvider locale={locale} messages={getMessages(locale)}>
          {children}
        </I18nProvider>
        <Suspense fallback={null}>
          <GoogleTag />
          <PageTracker />
        </Suspense>
      </body>
    </html>
  );
}
