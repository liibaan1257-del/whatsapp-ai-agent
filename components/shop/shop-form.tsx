"use client";

import { useActionState, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveShop, type ShopState } from "@/lib/dashboard/shop-actions";

/** Page address + WhatsApp number, and (once saved) open/copy the public link. */
export function ShopForm({ slug, whatsapp, url }: { slug: string; whatsapp: string; url: string | null }) {
  const t = useI18n().m.shop;
  const [state, action, pending] = useActionState<ShopState, FormData>(saveShop, {});
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="shop_slug">{t.slug}</Label>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground" dir="ltr">
              replybooker.com/s/
            </span>
            <Input id="shop_slug" name="slug" defaultValue={slug} required maxLength={50} dir="ltr" className="max-w-xs" />
          </div>
          <p className="text-xs text-muted-foreground">{t.slugHint}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shop_whatsapp">{t.whatsapp}</Label>
          <Input id="shop_whatsapp" name="whatsapp" defaultValue={whatsapp} required type="tel" dir="ltr" maxLength={40} placeholder="061 234 5678" className="max-w-xs" />
          <p className="text-xs text-muted-foreground">{t.whatsappHint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="brand" disabled={pending}>
            {t.save}
          </Button>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : state.ok ? (
            <p role="status" className="text-sm text-brand">
              {t.saved}
            </p>
          ) : null}
        </div>
      </form>

      {url ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <span className="font-mono" dir="ltr">
            {url.replace(/^https?:\/\//, "")}
          </span>
          <Button variant="outline" size="sm" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" />
              {t.open}
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard?.writeText(url).then(() => setCopied(true));
            }}
          >
            <Copy aria-hidden="true" />
            {copied ? t.copied : t.copy}
          </Button>
          <p className="w-full text-xs text-muted-foreground">{t.share}</p>
        </div>
      ) : null}
    </div>
  );
}
