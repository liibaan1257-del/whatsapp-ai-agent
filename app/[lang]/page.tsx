import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PrivacyLink } from "@/components/privacy-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { contactWhatsapp } from "@/lib/contact";
import { getMessages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const m = getMessages(localeFrom((await params).lang));
  const whatsapp = contactWhatsapp();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-brand/15 text-brand">
        <MessageCircle className="size-6" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{m.meta.appName}</h1>
        <p className="max-w-md text-muted-foreground">{m.home.tagline}</p>
      </div>
      <div className="flex gap-3">
        <Button variant="brand" asChild>
          <Link href="/signup">{m.home.getStarted}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">{m.home.signIn}</Link>
        </Button>
      </div>
      {whatsapp ? (
        <a href={whatsapp.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-brand underline-offset-4 hover:underline">
          <MessageCircle className="size-4" aria-hidden="true" />
          {m.common.whatsappContact}
        </a>
      ) : null}
      <div className="w-48 space-y-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <PrivacyLink />
      </div>
    </main>
  );
}
