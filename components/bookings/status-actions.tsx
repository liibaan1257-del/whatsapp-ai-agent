"use client";

import { useActionState } from "react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/i18n/config";
import { updateBookingStatus, type BookingActionState } from "@/lib/dashboard/booking-actions";

type Status = "pending" | "confirmed" | "cancelled" | "completed";

const ACTIONS: Record<Status, { to: Status; label: "confirm" | "cancel" | "done"; variant: "brand" | "outline" | "ghost" }[]> = {
  pending: [
    { to: "confirmed", label: "confirm", variant: "brand" },
    { to: "cancelled", label: "cancel", variant: "ghost" },
  ],
  confirmed: [
    { to: "completed", label: "done", variant: "outline" },
    { to: "cancelled", label: "cancel", variant: "ghost" },
  ],
  cancelled: [],
  completed: [],
};

/** Status buttons for one booking, with the result shown inline. */
export function StatusActions({ id, status, customer }: { id: string; status: Status; customer: string }) {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<BookingActionState, FormData>(updateBookingStatus, {});
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ACTIONS[status].map((a) => (
        <form key={a.to} action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={a.to} />
          <Button type="submit" size="sm" variant={a.variant} disabled={pending} aria-label={fmt(m.bookings.actionLabel, { action: m.bookings[a.label], name: customer })}>
            {m.bookings[a.label]}
          </Button>
        </form>
      ))}
      <span aria-live="polite" className="text-xs">
        {state.error ? <span className="text-destructive">{state.error}</span> : state.notice ? <span className="text-muted-foreground">{state.notice}</span> : null}
      </span>
    </div>
  );
}
