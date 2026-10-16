"use client";

import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fmt } from "@/lib/i18n/config";

/** The owner's invite link with copy / WhatsApp share, and how many signups and free months it earned. */
export function ReferralCard({ link, signups, rewards }: { link: string; signups: number; rewards: number }) {
  const { m } = useI18n();
  const t = m.referral;
  const [copied, setCopied] = useState(false);
  const share = `https://wa.me/?text=${encodeURIComponent(fmt(t.shareText, { link }))}`;
  return (
    <Card id="invite">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.hint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <label htmlFor="invite_link" className="text-sm font-medium">
          {t.linkLabel}
        </label>
        <div className="flex flex-wrap gap-2">
          <Input id="invite_link" readOnly dir="ltr" value={link} className="max-w-sm" onFocus={(e) => e.currentTarget.select()} />
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                // Clipboard blocked: the field is selectable instead.
              }
            }}
          >
            <Copy aria-hidden="true" />
            {copied ? t.copied : t.copy}
          </Button>
          <Button variant="brand" asChild>
            <a href={share} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" />
              {t.share}
            </a>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{fmt(t.stats, { signups, rewards })}</p>
      </CardContent>
    </Card>
  );
}
