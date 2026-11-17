import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { configStatus, serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { notifyOperator } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Security log (table security_events): rate limits for the public auth forms
 * and email alerts to the operator. Best effort everywhere: if the database or
 * email is down, the app keeps working (a check that can't run never blocks).
 */

export type SecurityKind = "login_failed" | "login_blocked" | "signup" | "password_reset" | "error" | "admin" | "alert";

/** Salted hash of the visitor's IP (Vercel sets x-forwarded-for); "" when unknown. */
export async function visitorKey(): Promise<string> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim();
  if (!ip) return "";
  return createHash("sha256")
    .update(`${serverEnv.cronSecret() ?? ""}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

function db() {
  return configStatus().serviceRole ? createAdminClient() : null;
}

export async function recordEvent(kind: SecurityKind, key = "", detail?: string): Promise<void> {
  try {
    const client = db();
    if (!client) return;
    const { error } = await client.from("security_events").insert({ kind, key, detail: detail?.slice(0, 500) ?? null });
    if (error) logger.warn("security_event_failed", { code: error.code });
  } catch (error) {
    logger.warn("security_event_failed", { error: String(error) });
  }
}

/** How many `kind` events for `key` in the last `minutes`. 0 when it can't tell. */
export async function countEvents(kind: SecurityKind, key: string, minutes: number): Promise<number> {
  try {
    const client = db();
    if (!client) return 0;
    const since = new Date(Date.now() - minutes * 60_000).toISOString();
    const { count } = await client.from("security_events").select("id", { count: "exact", head: true }).eq("kind", kind).eq("key", key).gte("created_at", since);
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Emails the operator, at most once per `dedupe` key per hour. */
export async function alertOperator(dedupe: string, subject: string, text: string): Promise<void> {
  try {
    const key = createHash("sha256").update(dedupe).digest("hex").slice(0, 32);
    if ((await countEvents("alert", key, 60)) > 0) return;
    await recordEvent("alert", key, subject);
    await notifyOperator(`🚨 ReplyBooker: ${subject}`, text);
  } catch (error) {
    logger.warn("security_alert_failed", { error: String(error) });
  }
}

/** Limits for the public auth forms, per visitor (IP). */
export const LIMITS = {
  loginFailed: { max: 10, minutes: 15 },
  signup: { max: 5, minutes: 60 },
  passwordReset: { max: 5, minutes: 60 },
} as const;

/** True when this visitor has used up `limit` for `kind` (the caller then refuses). */
export async function overLimit(kind: SecurityKind, key: string, limit: { max: number; minutes: number }): Promise<boolean> {
  if (!key) return false;
  return (await countEvents(kind, key, limit.minutes)) >= limit.max;
}

/** Daily summary for the operator (cron): last 24h of security events, then drops events older than 30 days. */
export async function sendSecurityDigest(): Promise<{ securityDigest: boolean }> {
  const client = db();
  if (!client) return { securityDigest: false };
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data } = await client.from("security_events").select("kind, detail").gte("created_at", since).limit(5000);
  const rows = data ?? [];
  const count = (k: SecurityKind) => rows.filter((r) => r.kind === k).length;
  const errors = rows.filter((r) => r.kind === "error").map((r) => r.detail ?? "");
  const topErrors = [...new Set(errors)].slice(0, 10);
  const admin = rows.filter((r) => r.kind === "admin").map((r) => r.detail ?? "");

  const text = [
    "ReplyBooker — warbixinta amniga (24 saac) / security summary (24h)",
    "",
    `• Signups / Is-diiwaangelin: ${count("signup")}`,
    `• Failed logins / Login fashilmay: ${count("login_failed")}`,
    `• Blocked (too many tries) / La xannibay: ${count("login_blocked")}`,
    `• Password resets: ${count("password_reset")}`,
    `• Server errors / Ciladaha: ${errors.length}`,
    ...(topErrors.length ? ["", "Errors:", ...topErrors.map((e) => `  - ${e}`)] : []),
    ...(admin.length ? ["", "Admin actions:", ...admin.slice(0, 30).map((a) => `  - ${a}`)] : []),
  ].join("\n");
  await notifyOperator(`ReplyBooker: amniga maanta · ${errors.length} cilad · ${count("login_blocked")} xannibaad`, text);

  await client.from("security_events").delete().lt("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString());
  return { securityDigest: true };
}
