import type { Locale } from "./config";
import { ar } from "./messages/ar";
import { de } from "./messages/de";
import { en, type Messages } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";
import { so } from "./messages/so";

export type { Messages };

const DICTIONARIES: Record<Locale, Messages> = { en, es, fr, de, ar, so };

export function getMessages(locale: Locale): Messages {
  return DICTIONARIES[locale];
}
