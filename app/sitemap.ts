import type { MetadataRoute } from "next";
import { INDUSTRIES } from "@/lib/industries";
import { siteUrl } from "@/lib/site";
import { listShopSlugs } from "@/lib/shop-data";
import { ENGLISH_LINKS, SOMALI_LINKS } from "@/lib/somali-pages";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/signup`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    ...SOMALI_LINKS.map((l) => ({ url: `${base}${l.path}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...ENGLISH_LINKS.map((l) => ({ url: `${base}${l.path}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...(await listShopSlugs()).map((slug) => ({ url: `${base}/s/${slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...INDUSTRIES.map((slug) => ({ url: `${base}/for/${slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
