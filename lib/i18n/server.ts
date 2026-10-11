import "server-only";
import { cookies, headers } from "next/headers";
import { isLocale, LOCALE_COOKIE, matchLocale, type Locale } from "./config";
import { getMessages, type Messages } from "./dictionaries";

/**
 * The language of the current request, for server actions and route handlers
 * (pages get it from the [lang] segment instead): cookie, then browser.
 */
export async function requestLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return matchLocale((await headers()).get("accept-language"));
}

export async function requestMessages(): Promise<Messages> {
  return getMessages(await requestLocale());
}

/** Locale from a [lang] route param (proxy.ts only ever rewrites to valid ones). */
export function localeFrom(lang: string): Locale {
  return isLocale(lang) ? lang : "en";
}
