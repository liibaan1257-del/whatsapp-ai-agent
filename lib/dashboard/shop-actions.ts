"use server";

import { refresh, updateTag } from "next/cache";
import { headers } from "next/headers";
import { getOwner } from "@/lib/auth/session";
import { isActive } from "@/lib/billing";
import { requestMessages } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import { normalizeWhatsapp } from "@/lib/phone";
import { SHOP_SLUG, slugify } from "@/lib/shop";
import { shopTag } from "@/lib/shop-data";
import { createClient } from "@/lib/supabase/server";

export type ShopState = { ok?: boolean; error?: string };

/** Paths the public page can't take (they read like site pages). */
const RESERVED = new Set(["admin", "api", "dashboard", "login", "signup", "replybooker", "poster", "www"]);

/** Owner sets their page address (replybooker.com/s/<slug>) and the WhatsApp number it opens. */
export async function saveShop(_prev: ShopState, formData: FormData): Promise<ShopState> {
  const m = await requestMessages();
  const t = m.shop.errors;
  const owner = await getOwner();
  if (!owner) return { error: m.common.signInAgain };
  if (!isActive(owner.accessUntil)) return { error: m.shop.lockedBody };

  const slug = slugify(String(formData.get("slug") ?? ""));
  if (!SHOP_SLUG.test(slug) || RESERVED.has(slug)) return { error: t.slug };
  const country = ((await headers()).get("x-vercel-ip-country") ?? "").toUpperCase();
  const whatsapp = normalizeWhatsapp(String(formData.get("whatsapp") ?? "").slice(0, 40), country);
  if (!whatsapp) return { error: t.whatsapp };

  const { error } = await (await createClient())
    .from("business_knowledge")
    .update({ public_slug: slug, public_whatsapp: whatsapp })
    .eq("id", owner.businessId);
  if (error) {
    if (error.code === "23505") return { error: t.taken };
    logger.error("shop_save_failed", { ownerId: owner.id, code: error.code });
    return { error: t.failed };
  }
  updateTag(shopTag(slug));
  refresh();
  return { ok: true };
}
