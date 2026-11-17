/**
 * Server start-up: errors logged with logger.error, and unhandled request
 * errors, are recorded in security_events and emailed to the operator
 * (at most once per error per hour). Node.js runtime only.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { setErrorHook } = await import("@/lib/logger");
  const { alertOperator, recordEvent } = await import("@/lib/security/events");
  setErrorHook((message, fields) => {
    const where = typeof fields.route === "string" ? ` (${fields.route})` : "";
    void recordEvent("error", "", `${message}${where}`);
    void alertOperator(`error:${message}`, `Cilad / error: ${message}${where}`, `Cilad ayaa ka dhacday ReplyBooker:\n\n${message}${where}\n\nTime: ${new Date().toISOString()}\n\nVercel logs: https://vercel.com/servise-it-support/whatsapp-ai-agent/logs`);
  });
}

export async function onRequestError(error: unknown, request: { path: string; method: string }) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { alertOperator, recordEvent } = await import("@/lib/security/events");
  const name = error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 200) : "unknown error";
  const path = request.path.split("?")[0].slice(0, 100);
  await recordEvent("error", "", `${name} (${request.method} ${path})`);
  await alertOperator(`request:${path}:${name}`, `Cilad bogga ${path}`, `Cilad ayaa ka dhacday bogga ${path}:\n\n${name}\n\nTime: ${new Date().toISOString()}\n\nVercel logs: https://vercel.com/servise-it-support/whatsapp-ai-agent/logs`);
}
