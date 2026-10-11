"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/provider";

export function PrivacyLink() {
  const { m } = useI18n();
  return (
    <Link href="/privacy" className="block text-center text-xs text-muted-foreground underline-offset-4 hover:underline">
      {m.common.privacy}
    </Link>
  );
}
