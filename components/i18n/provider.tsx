"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/dictionaries";

const I18nContext = createContext<{ locale: Locale; m: Messages } | null>(null);

/** Gives client components the current language's text (only that one language is sent to the browser). */
export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, m: messages }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
