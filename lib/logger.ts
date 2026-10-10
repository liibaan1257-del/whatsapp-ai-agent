/**
 * Structured JSON logs (one object per line, easy to search in Vercel logs).
 * Never log secrets or message text: customers' messages are personal data.
 */
type Fields = Record<string, unknown>;

function write(level: "info" | "warn" | "error", message: string, fields: Fields = {}) {
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, fields?: Fields) => write("info", message, fields),
  warn: (message: string, fields?: Fields) => write("warn", message, fields),
  error: (message: string, fields?: Fields) => write("error", message, fields),
};
