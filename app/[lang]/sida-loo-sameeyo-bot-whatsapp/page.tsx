import { SomaliLanding, somaliPageMetadata } from "@/components/marketing/somali-landing";
import { LOCALES } from "@/lib/i18n/config";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const metadata = somaliPageMetadata("sida-loo-sameeyo-bot-whatsapp");

export default function Page() {
  return <SomaliLanding slug="sida-loo-sameeyo-bot-whatsapp" />;
}
