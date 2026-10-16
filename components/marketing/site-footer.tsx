import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PrivacyLink } from "@/components/privacy-link";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Messages } from "@/lib/i18n/dictionaries";
import { INDUSTRIES } from "@/lib/industries";
import { SOCIAL_LINKS } from "@/lib/site";

/** Public pages' footer: one link per business type (helps owners and search engines find them). */
export function SiteFooter({ m }: { m: Messages }) {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <p className="text-sm font-medium">{m.industries.footerTitle}</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {INDUSTRIES.map((slug) => (
            <li key={slug}>
              <Link href={`/for/${slug}`} className="hover:text-foreground">
                {m.industries.list[slug].name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6">
        <p>
          © {m.meta.appName}. {m.landing.rights}
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
  );
}
