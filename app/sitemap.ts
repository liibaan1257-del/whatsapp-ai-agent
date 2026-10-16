import type { MetadataRoute } from "next";
import { INDUSTRIES } from "@/lib/industries";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/signup`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    ...INDUSTRIES.map((slug) => ({ url: `${base}/for/${slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
