/** The public address search engines and shared links should use. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.replybooker.com").replace(/\/+$/, "");
}

/** Public social profiles: footer links, and the sameAs list search engines read. */
export const SOCIAL_LINKS = [
  { name: "TikTok", url: "https://www.tiktok.com/@liiboy042" },
  { name: "Instagram", url: "https://www.instagram.com/p/Debw_G_KgmC/" },
  { name: "LinkedIn", url: "https://lnkd.in/p/db_NA8c2" },
] as const;
