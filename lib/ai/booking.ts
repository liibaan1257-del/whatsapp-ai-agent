import type { AgentOutput } from "@/lib/ai/agent";
import type { Knowledge, Service } from "@/lib/knowledge";
import { displayHhmm, formatInZone, hhmmInZone, partsInZone, zonedToUtc } from "@/lib/time";

/**
 * Server-side checks for a booking the AI captured. The model is never
 * trusted on its own: the service must exist, the time must be in the future
 * and inside opening hours, and the slot must be free.
 */

export type ExistingBooking = { date_time: string; service_selected: string };

export type BookingCheck =
  | { ok: true; start: Date; service: string; customerName: string; notes: string }
  | { ok: false; reason: "unknown_service" | "bad_datetime" | "in_past" | "closed" | "taken" | "missing_name"; message: string };

const DEFAULT_DURATION = 30;
const MAX_DAYS_AHEAD = 365;

function findService(services: Service[], name: string): Service | null {
  const wanted = name.trim().toLowerCase();
  return services.find((s) => s.name.trim().toLowerCase() === wanted) ?? null;
}

function hoursText(k: Knowledge): string {
  const open = Object.entries(k.working_hours).filter(([, h]) => h);
  return open.length
    ? open.map(([d, h]) => `${d} ${displayHhmm(h!.open, k.time_format)}–${displayHhmm(h!.close, k.time_format)}`).join(", ")
    : "our opening hours";
}

export function checkBooking(
  k: Knowledge,
  booking: NonNullable<AgentOutput["booking"]>,
  existing: ExistingBooking[],
  now = new Date(),
): BookingCheck {
  const customerName = booking.customer_name.trim().slice(0, 120);
  if (!customerName) return { ok: false, reason: "missing_name", message: "Could you tell me the name for the booking?" };

  // With a service list, the service must be on it.
  let service: Service | null = null;
  if (k.services.length) {
    service = findService(k.services, booking.service);
    if (!service) {
      return {
        ok: false,
        reason: "unknown_service",
        message: `Sorry, I couldn't find "${booking.service}". We offer: ${k.services.map((s) => s.name).join(", ")}. Which one would you like?`,
      };
    }
  }
  const serviceName = (service?.name ?? booking.service.trim()).slice(0, 200);
  if (!serviceName) return { ok: false, reason: "unknown_service", message: "Which service would you like to book?" };

  const start = zonedToUtc(booking.date, booking.time, k.timezone);
  if (!start) return { ok: false, reason: "bad_datetime", message: "Sorry, I couldn't read that date and time. Could you send it again?" };
  if (start.getTime() <= now.getTime()) {
    return { ok: false, reason: "in_past", message: "That time has already passed. Which future day and time suits you?" };
  }
  if (start.getTime() > now.getTime() + MAX_DAYS_AHEAD * 86_400_000) {
    return { ok: false, reason: "bad_datetime", message: "We can only book up to a year ahead. Could you pick an earlier date?" };
  }

  // Inside opening hours (when hours are set). The whole appointment must fit.
  const duration = service?.duration_minutes ?? DEFAULT_DURATION;
  const end = new Date(start.getTime() + duration * 60_000);
  const hasHours = Object.values(k.working_hours).some(Boolean);
  if (hasHours) {
    const day = partsInZone(start, k.timezone).weekday;
    const hours = k.working_hours[day];
    const startHm = hhmmInZone(start, k.timezone);
    const endHm = hhmmInZone(end, k.timezone);
    const sameDay = partsInZone(end, k.timezone).day === partsInZone(start, k.timezone).day;
    if (!hours || startHm < hours.open || !sameDay || endHm > hours.close) {
      return {
        ok: false,
        reason: "closed",
        message: `Sorry, we're not open for that time (${formatInZone(start, k.timezone, k.time_format)}). Our hours: ${hoursText(k)}. Which time works for you?`,
      };
    }
  }

  // One appointment at a time: no overlap with pending or confirmed bookings.
  const durationOf = (name: string) => findService(k.services, name)?.duration_minutes ?? DEFAULT_DURATION;
  const clash = existing.some((b) => {
    const bStart = new Date(b.date_time).getTime();
    const bEnd = bStart + durationOf(b.service_selected) * 60_000;
    return bStart < end.getTime() && bEnd > start.getTime();
  });
  if (clash) {
    return { ok: false, reason: "taken", message: "Sorry, that time is already booked. Could you choose another time?" };
  }

  return { ok: true, start, service: serviceName, customerName, notes: booking.notes.trim().slice(0, 1000) };
}
