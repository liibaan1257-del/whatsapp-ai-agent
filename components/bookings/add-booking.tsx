"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addBooking, type AddBookingState } from "@/lib/dashboard/booking-actions";

const select =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Manual booking form (phone calls, walk-ins). */
export function AddBooking({ services, timeZone }: { services: string[]; timeZone: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<AddBookingState, FormData>(async (prev, fd) => {
    const result = await addBooking(prev, fd);
    if (result.ok) setOpen(false);
    return result;
  }, {});
  const fe = state.fieldErrors ?? {};

  if (!open) {
    return (
      <Button variant="brand" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" /> Add booking
      </Button>
    );
  }

  const field = (id: string, label: string, input: React.ReactNode) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {input}
      {fe[id] ? <p className="text-xs text-destructive">{fe[id]}</p> : null}
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add a booking</CardTitle>
        <CardDescription>For phone calls and walk-ins. Time in {timeZone}.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field("customer_name", "Customer name", <Input id="customer_name" name="customer_name" maxLength={120} required aria-invalid={fe.customer_name ? true : undefined} />)}
          {field("phone_number", "Phone", <Input id="phone_number" name="phone_number" type="tel" placeholder="+252 61 000 0000" required aria-invalid={fe.phone_number ? true : undefined} />)}
          {field(
            "service_selected",
            "Service",
            services.length ? (
              <select id="service_selected" name="service_selected" className={select} required>
                {services.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <Input id="service_selected" name="service_selected" maxLength={200} required />
            ),
          )}
          {field("date", "Date", <Input id="date" name="date" type="date" required aria-invalid={fe.date ? true : undefined} />)}
          {field("time", "Time", <Input id="time" name="time" type="time" required />)}
          {field(
            "status",
            "Status",
            <select id="status" name="status" className={select} defaultValue="confirmed">
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            </select>,
          )}
          <div className="sm:col-span-2 lg:col-span-3">{field("notes", "Notes (optional)", <Input id="notes" name="notes" maxLength={1000} />)}</div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? "Saving…" : "Save booking"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
