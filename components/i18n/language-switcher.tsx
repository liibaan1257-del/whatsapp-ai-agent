"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/** Dashboard language picker: remembered in a cookie for a year, then the page reloads in that language. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, m } = useI18n();
  function change(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }
  return (
    <label className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <Languages className="size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{m.common.language}</span>
      <select
        aria-label={m.common.language}
        value={locale}
        onChange={(e) => change(e.target.value as Locale)}
        className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
