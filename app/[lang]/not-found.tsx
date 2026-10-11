"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/provider";

export default function NotFound() {
  const { m } = useI18n();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{m.common.notFoundTitle}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{m.common.notFoundBody}</p>
      <Button variant="outline" asChild>
        <Link href="/dashboard">{m.common.backHome}</Link>
      </Button>
    </main>
  );
}
