import type { AgentOutput } from "@/lib/ai/agent";
import type { Knowledge, Service } from "@/lib/knowledge";

/**
 * Server-side checks for an order the AI captured. Like bookings, the model is
 * never trusted on its own: item names are matched against the business's own
 * list and the line/total prices are computed from that list, so the AI can't
 * invent a price. Items it doesn't recognise are still recorded (quantity +
 * name), just without a price, so the owner can price them by hand.
 */

export type OrderLine = { name: string; quantity: number; unitPrice: number | null; lineTotal: number | null };

export type OrderCheck =
  | { ok: true; customerName: string; lines: OrderLine[]; total: number; currency: string; note: string; anyPriced: boolean }
  | { ok: false; reason: "no_items" | "missing_name"; message: string };

/** The first number in a free-form price like "$5", "5.00 USD" or "Ksh 1,200". */
function parsePrice(price: string): number | null {
  const m = price.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function findService(services: Service[], name: string): Service | null {
  const wanted = name.trim().toLowerCase();
  return services.find((s) => s.name.trim().toLowerCase() === wanted) ?? null;
}

export function checkOrder(k: Knowledge, order: NonNullable<AgentOutput["order"]>): OrderCheck {
  const customerName = order.customer_name.trim().slice(0, 120);
  if (!customerName) return { ok: false, reason: "missing_name", message: "Could you tell me the name for the order?" };

  const items = order.items.filter((i) => i.name.trim() && i.quantity > 0).slice(0, 50);
  if (!items.length) return { ok: false, reason: "no_items", message: "What would you like to order?" };

  let total = 0;
  let anyPriced = false;
  const lines: OrderLine[] = items.map((i) => {
    const svc = findService(k.services, i.name);
    const unitPrice = svc ? parsePrice(svc.price) : null;
    const quantity = Math.min(Math.max(1, Math.trunc(i.quantity)), 999);
    const lineTotal = unitPrice != null ? Number((unitPrice * quantity).toFixed(2)) : null;
    if (lineTotal != null) {
      total += lineTotal;
      anyPriced = true;
    }
    return { name: (svc?.name ?? i.name.trim()).slice(0, 120), quantity, unitPrice, lineTotal };
  });

  return { ok: true, customerName, lines, total: Number(total.toFixed(2)), currency: k.currency, note: order.note.trim().slice(0, 1000), anyPriced };
}
