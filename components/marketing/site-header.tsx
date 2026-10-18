import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Messages } from "@/lib/i18n/dictionaries";

/** Public pages' top bar. `sections` adds in-page links (home page only). */
export function SiteHeader({ m, sections = false }: { m: Messages; sections?: boolean }) {
  const t = m.landing;
  const prefix = sections ? "" : "/";
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label={m.meta.appName} className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-brand/15 text-brand">
            <MessageCircle className="size-4" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">{m.meta.appName}</span>
        </Link>
        <nav className="ms-auto hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          <a href={`${prefix}#features`} className="hover:text-foreground">{t.nav.features}</a>
          <a href={`${prefix}#pricing`} className="hover:text-foreground">{t.nav.pricing}</a>
          <a href={`${prefix}#faq`} className="hover:text-foreground">{t.nav.faq}</a>
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
  );
}
