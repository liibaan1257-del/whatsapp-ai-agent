// Run: npx tsx tests/booking.test.ts
import assert from "node:assert/strict";
import { checkBooking } from "@/lib/ai/booking";
import { parseKnowledge } from "@/lib/knowledge";
import { zonedToUtc, partsInZone } from "@/lib/time";

let n = 0;
const test = (name: string, fn: () => void) => { fn(); n++; console.log("✅", name); };

test("Mogadishu (UTC+3) local → UTC", () => {
  assert.equal(zonedToUtc("2026-10-12", "09:00", "Africa/Mogadishu")?.toISOString(), "2026-10-12T06:00:00.000Z");
});
test("New York across DST: summer −4, winter −5", () => {
  assert.equal(zonedToUtc("2026-07-01", "10:00", "America/New_York")?.toISOString(), "2026-07-01T14:00:00.000Z");
  assert.equal(zonedToUtc("2026-12-01", "10:00", "America/New_York")?.toISOString(), "2026-12-01T15:00:00.000Z");
});
test("non-existent local time (spring-forward gap) → null", () => {
  assert.equal(zonedToUtc("2026-03-08", "02:30", "America/New_York"), null);
});
test("invalid dates/times → null", () => {
  assert.equal(zonedToUtc("2026-02-30", "10:00", "UTC"), null);
  assert.equal(zonedToUtc("2026-10-12", "25:00", "UTC"), null);
  assert.equal(zonedToUtc("12/10/2026", "10:00", "UTC"), null);
});
test("weekday in zone", () => {
  assert.equal(partsInZone(new Date("2026-10-12T06:00:00Z"), "Africa/Mogadishu").weekday, "mon");
});

const k = parseKnowledge({
  id: "b1",
  business_name: "Amina Salon",
  timezone: "Africa/Mogadishu",
  services: [{ name: "Haircut", price: "$15", duration_minutes: 30 }, { name: "Braids", price: "$40", duration_minutes: 120 }],
  working_hours: { mon: { open: "09:00", close: "17:00" }, fri: null },
});
const now = new Date("2026-10-10T08:00:00Z"); // Saturday 11:00 local
const req = (o: Partial<{ service: string; date: string; time: string; customer_name: string; notes: string }>) => ({
  service: "Haircut", date: "2026-10-12", time: "10:00", customer_name: "Amina", notes: "", ...o,
});

test("valid booking (service matched case-insensitively)", () => {
  const r = checkBooking(k, req({ service: "haircut" }), [], now);
  assert.ok(r.ok);
  if (r.ok) { assert.equal(r.service, "Haircut"); assert.equal(r.start.toISOString(), "2026-10-12T07:00:00.000Z"); }
});
test("unknown service", () => assert.equal(checkBooking(k, req({ service: "Massage" }), [], now).ok || "x", "x"));
test("in the past", () => {
  const r = checkBooking(k, req({ date: "2026-10-09" }), [], now);
  assert.ok(!r.ok && r.reason === "in_past");
});
test("closed day (Friday) and unset day (Tuesday)", () => {
  const fri = checkBooking(k, req({ date: "2026-10-16" }), [], now);
  const tue = checkBooking(k, req({ date: "2026-10-13" }), [], now);
  assert.ok(!fri.ok && fri.reason === "closed"); assert.ok(!tue.ok && tue.reason === "closed");
});
test("before opening / runs past closing", () => {
  const early = checkBooking(k, req({ time: "08:30" }), [], now);
  const late = checkBooking(k, req({ service: "Braids", time: "16:00" }), [], now);
  const lastSlot = checkBooking(k, req({ time: "16:30" }), [], now);
  assert.ok(!early.ok && early.reason === "closed"); assert.ok(!late.ok && late.reason === "closed"); assert.ok(lastSlot.ok);
});
test("overlap with an existing booking", () => {
  const existing = [{ date_time: "2026-10-12T06:00:00Z", service_selected: "Braids" }]; // 09:00–11:00 local
  const r = checkBooking(k, req({ time: "10:30" }), existing, now);
  assert.ok(!r.ok && r.reason === "taken");
  assert.ok(checkBooking(k, req({ time: "11:00" }), existing, now).ok);
});
test("missing name", () => {
  const r = checkBooking(k, req({ customer_name: "  " }), [], now);
  assert.ok(!r.ok && r.reason === "missing_name");
});
test("parseKnowledge keeps valid fields when one is bad", () => {
  const bad = parseKnowledge({ id: "x", business_name: "Ok", services: "nope", timezone: "UTC" });
  assert.equal(bad.business_name, "Ok"); assert.deepEqual(bad.services, []);
});
console.log(`\n${n} passed`);
