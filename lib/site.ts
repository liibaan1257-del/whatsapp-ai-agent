/** The public address search engines and shared links should use. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.replybooker.com").replace(/\/+$/, "");
}
