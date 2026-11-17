import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isActive } from "@/lib/billing";
import { configStatus } from "@/lib/env";
import { parseKnowledge, type Knowledge } from "@/lib/knowledge";
import { SHOP_SLUG } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

export type Shop = {
  slug: string;
  name: string;
  description: string;
  services: Knowledge["services"];
  hours: Knowledge["working_hours"];
  currency: string;
  timeFormat: Knowledge["time_format"];
  logo: string | null;
  whatsapp: string;
};

/**
 * A business's public page data, or null (unknown slug, no number, or access ended).
 * Read with the service role, returning only fields meant for the public.
 */
export async function getShop(slug: string): Promise<Shop | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(shopTag(slug));
  if (!SHOP_SLUG.test(slug) || !configStatus().serviceRole) return null;
  const { data } = await createAdminClient()
    .from("business_knowledge")
    .select("business_name, description, services, working_hours, currency, time_format, logo, public_slug, public_whatsapp, access_until")
    .eq("public_slug", slug)
    .maybeSingle();
  if (!data?.public_whatsapp || !isActive(String(data.access_until ?? 0))) return null;
  const k = parseKnowledge(data as Record<string, unknown>);
  return {
    slug,
    name: k.business_name || slug,
    description: k.description,
    services: k.services,
    hours: k.working_hours,
    currency: k.currency,
    timeFormat: k.time_format,
    logo: (data.logo as string | null) ?? null,
    whatsapp: String(data.public_whatsapp),
  };
}

/** Cache tag for one shop page (cleared when its owner saves). */
export function shopTag(slug: string): string {
  return `shop:${slug}`;
}

/** Active public pages, for the sitemap. */
export async function listShopSlugs(): Promise<string[]> {
  if (!configStatus().serviceRole) return [];
  const { data } = await createAdminClient()
    .from("business_knowledge")
    .select("public_slug")
    .not("public_slug", "is", null)
    .not("public_whatsapp", "is", null)
    .gt("access_until", new Date().toISOString())
    .limit(5000);
  return (data ?? []).map((r) => String(r.public_slug));
}
