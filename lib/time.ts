/**
 * Time-zone helpers without extra dependencies. Bookings are stored in UTC;
 * the business thinks in its own local time.
 */

import type { Day } from "@/lib/knowledge";

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: Day };

const WEEKDAYS: Record<string, Day> = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat", Sun: "sun" };

/** Wall-clock parts of an instant in a time zone. */
export function partsInZone(date: Date, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const get = (type: string) => fmt.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: WEEKDAYS[get("weekday")] ?? "mon",
  };
}

/**
 * The UTC instant for a local date ("YYYY-MM-DD") and time ("HH:MM") in a
 * time zone. Returns null for invalid dates or times that don't exist
 * (e.g. skipped by a daylight-saving change).
 */
export function zonedToUtc(date: string, time: string, timeZone: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!d || !t) return null;
  const [y, mo, da, h, mi] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])];
  const wanted = Date.UTC(y, mo - 1, da, h, mi);
  if (new Date(wanted).getUTCDate() !== da) return null; // e.g. 2026-02-30

  // Guess, measure the zone's offset at the guess, correct; twice covers DST edges.
  let guess = wanted;
  for (let i = 0; i < 2; i++) {
    const p = partsInZone(new Date(guess), timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += wanted - asUtc;
  }
  const check = partsInZone(new Date(guess), timeZone);
  if (check.hour !== h || check.minute !== mi || check.day !== da) return null;
  return new Date(guess);
}

/** "Saturday 10 October 2026, 14:05" in the business's time zone. */
export function formatInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/** "HH:MM" for an instant in a time zone. */
export function hhmmInZone(date: Date, timeZone: string): string {
  const p = partsInZone(date, timeZone);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}
