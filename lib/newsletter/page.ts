import { dirOf, isLocale, type Locale } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/site";

export const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function localeOr(value: unknown): Locale {
  return isLocale(value) ? value : "en";
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A tiny standalone page for the confirm / unsubscribe links (no app shell, no scripts). */
export function smallPage(locale: Locale, title: string, body: string, form?: { action: string; button: string }, status = 200) {
  const html = `<!doctype html><html lang="${locale}" dir="${dirOf(locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escape(title)} · ReplyBooker</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#f6f7f6;color:#111;display:grid;place-items:center;min-height:100vh;padding:16px}main{max-width:420px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;text-align:center}h1{font-size:20px;margin:0 0 8px}p{color:#555;margin:0 0 20px}a,button{display:inline-block;background:#0fa05c;color:#fff;border:0;border-radius:8px;padding:10px 18px;font:inherit;text-decoration:none;cursor:pointer}@media (prefers-color-scheme:dark){body{background:#0b0d0c;color:#eee}main{background:#151816;border-color:#2a2e2b}p{color:#aaa}}</style></head>
<body><main><h1>${escape(title)}</h1><p>${escape(body)}</p>${
    form ? `<form method="post" action="${escape(form.action)}"><button type="submit">${escape(form.button)}</button></form>` : `<a href="${siteUrl()}/">ReplyBooker</a>`
  }</main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
