/**
 * Structured JSON logs (one object per line, easy to search in Vercel logs).
 * Never log secrets or message text: customers' messages are personal data.
 */
type Fields = Record<string, unknown>;

/** Set on the server (instrumentation.ts) to record and alert on errors. Never throws. */
let errorHook: ((message: string, fields: Fields) => void) | null = null;
export function setErrorHook(hook: (message: string, fields: Fields) => void) {
  errorHook = hook;
}

function write(level: "info" | "warn" | "error", message: string, fields: Fields = {}) {
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...fields });
  if (level === "error") {
    console.error(line);
    try {
      errorHook?.(message, fields);
    } catch {
      // alerts are best effort
    }
  }
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, fields?: Fields) => write("info", message, fields),
  warn: (message: string, fields?: Fields) => write("warn", message, fields),
  error: (message: string, fields?: Fields) => write("error", message, fields),
};
