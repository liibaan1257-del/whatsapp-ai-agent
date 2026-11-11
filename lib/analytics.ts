/** Pages that are never measured (business data, admin, account, API). */
export const PRIVATE_PATH = /^\/(?:[a-z]{2}\/)?(?:dashboard|admin|reset-password|api|auth)(?:\/|$)/;

export function isPrivatePath(path: string): boolean {
  return PRIVATE_PATH.test(path);
}

/** Start of the last `days` days, as an ISO timestamp. */
export function daysAgo(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}
