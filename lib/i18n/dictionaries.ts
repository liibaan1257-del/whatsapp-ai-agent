import type { Locale } from "./config";
import { ar } from "./messages/ar";
import { de } from "./messages/de";
import { en, type Messages } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";
import { ru } from "./messages/ru";
import { so } from "./messages/so";
import { sw } from "./messages/sw";
import { zh } from "./messages/zh";

export type { Messages };

const DICTIONARIES: Record<Locale, Messages> = { en, es, fr, de, ar, so, sw, ru, zh };

export function getMessages(locale: Locale): Messages {
  return DICTIONARIES[locale];
}
