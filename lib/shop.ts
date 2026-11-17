/** Public shop page helpers (safe anywhere). */

export const SHOP_SLUG = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/;

/** "Dukaanka Barwaaqo!" → "dukaanka-barwaaqo". "" when nothing usable is left. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

export function shopPath(slug: string): string {
  return `/s/${slug}`;
}

/** wa.me chat link with a greeting filled in. */
export function chatLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
