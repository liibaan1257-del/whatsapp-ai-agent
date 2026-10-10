/**
 * HTTP security headers for every response (applied in next.config.ts).
 * No imports: next.config.ts loads this file directly.
 */

const isDev = process.env.NODE_ENV === "development";

function supabaseOrigin(): string | null {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/[`'"\s]/g, "");
  try {
    return raw ? new URL(raw).origin : null;
  } catch {
    return null;
  }
}

/**
 * Content Security Policy. Pages are partially prerendered, so a per-request
 * nonce isn't possible and inline scripts are allowed; everything else is
 * locked down. connect-src allows Supabase (REST + Realtime websocket).
 */
function contentSecurityPolicy(): string {
  const supabase = supabaseOrigin();
  const supabaseWs = supabase?.replace(/^http/, "ws");
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(supabase ? [supabase] : []), ...(supabaseWs ? [supabaseWs] : [])],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

export const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];
