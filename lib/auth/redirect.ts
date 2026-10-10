export const LOGIN_PATH = "/login";
export const SIGNUP_PATH = "/signup";
export const DASHBOARD_HOME = "/dashboard";

/**
 * Only same-site relative paths are allowed as a post-login destination
 * (blocks ?next=https://evil.example and //evil.example).
 */
export function safeNextPath(value: unknown, fallback: string = DASHBOARD_HOME): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
