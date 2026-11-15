import { SomaliLanding, somaliPageMetadata } from "@/components/marketing/somali-landing";
import { LOCALES } from "@/lib/i18n/config";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const metadata = somaliPageMetadata("whatsapp-business-af-soomaali");

export default function Page() {
  return <SomaliLanding slug="whatsapp-business-af-soomaali" />;
}
