"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";

/** Terms · Privacy links (footers and auth pages). */
export function PrivacyLink({ className }: { className?: string }) {
  const { m } = useI18n();
  const link = "underline-offset-4 hover:text-foreground hover:underline";
  return (
    <span className={cn("flex items-center justify-center gap-2 text-xs text-muted-foreground", className)}>
      <Link href="/terms" className={link}>
        {m.terms.link}
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/privacy" className={link}>
        {m.common.privacy}
      </Link>
    </span>
  );
}
