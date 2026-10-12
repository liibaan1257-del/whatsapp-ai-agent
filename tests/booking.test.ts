// Run: npx tsx tests/booking.test.ts
import assert from "node:assert/strict";
import { checkBooking } from "@/lib/ai/booking";
import { parseKnowledge } from "@/lib/knowledge";
import { daysLeft, isActive, monthStart, replyLimit } from "@/lib/billing";
import { extractAnthropicKey, extractServiceKey } from "@/lib/env";
import { formatPrice } from "@/lib/format";
import { displayHhmm, zonedToUtc, partsInZone } from "@/lib/time";

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

test("prices: plain numbers get the currency, typed text stays as written", () => {
  assert.equal(formatPrice("15", "USD"), "$15.00");
  assert.equal(formatPrice("15,50", "EUR"), "€15.50");
  assert.equal(formatPrice("1500", "JPY"), "¥1,500");
  assert.equal(formatPrice("€15", "USD"), "€15");
  assert.equal(formatPrice("from 20", "GBP"), "from 20");
  assert.equal(formatPrice("", "USD"), "");
});

test("12h / 24h opening times", () => {
  assert.equal(displayHhmm("14:30", "24h"), "14:30");
  assert.equal(displayHhmm("14:30", "12h"), "2:30 PM");
  assert.equal(displayHhmm("00:15", "12h"), "12:15 AM");
});
test("plans: days left, active, monthly limits", () => {
  const now = new Date("2026-10-11T12:00:00Z");
  assert.equal(daysLeft(new Date(now.getTime() + 14 * 86400e3 - 5000), now), 14);
  assert.equal(daysLeft(new Date(now.getTime() + 3600e3), now), 1);
  assert.equal(daysLeft(new Date(now.getTime() - 1), now), -1);
  assert.equal(isActive("2026-10-11T12:00:01Z", now), true);
  assert.equal(isActive("2026-10-11T12:00:00Z", now), false);
  assert.equal(replyLimit("starter"), 500);
  assert.equal(replyLimit("bogus"), 200);
  assert.equal(monthStart(now).toISOString(), "2026-10-01T00:00:00.000Z");
});

test("service key: cleaned from common paste mistakes", () => {
  const key = "sb_secret_ABCDEFGHIJ1234567890-xyz_Q";
  assert.equal(extractServiceKey(key), key);
  assert.equal(extractServiceKey(`SUPABASE_SERVICE_ROLE_KEY=${key}`), key);
  assert.equal(extractServiceKey(`_${key}`), key);
  assert.equal(extractServiceKey(` "${key}"\n`), key);
  assert.equal(extractServiceKey("sb_secret_KW5NA••••••"), "sb_secret_KW5NA••••••"); // masked: can't be fixed
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.abc_DEF-123";
  assert.equal(extractServiceKey(`key: ${jwt} `), jwt);
  const ak = "sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWX_yz-123";
  assert.equal(extractAnthropicKey(`ANTHROPIC_API_KEY=${ak}\n`), ak);
  assert.equal(extractAnthropicKey(` "${ak}" `), ak);
});

console.log(`\n${n} passed`);
