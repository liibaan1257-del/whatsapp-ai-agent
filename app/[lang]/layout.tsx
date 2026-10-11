import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "@/components/i18n/provider";
import { dirOf, LOCALES } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// One static version per language; proxy.ts picks it from the `lang` cookie / browser.
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const m = getMessages(localeFrom((await params).lang));
  return {
    title: { default: m.meta.appName, template: `%s · ${m.meta.appName}` },
    description: m.meta.description,
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const locale = localeFrom((await params).lang);
  return (
    <html lang={locale} dir={dirOf(locale)} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <I18nProvider locale={locale} messages={getMessages(locale)}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
