"use client";

import { useEffect } from "react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";

/**
 * Any page error (server render, server action, browser): a translated
 * message plus Next's error digest, which matches the line in Vercel → Logs.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { m } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  const code = error.digest ?? (error.message || error.name).slice(0, 120);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{m.common.errorTitle}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{m.common.errorBody}</p>
      <code dir="ltr" className="max-w-md rounded-md bg-muted px-3 py-1.5 text-xs break-all select-all">
        {code}
      </code>
      <div className="flex gap-2">
        <Button variant="brand" onClick={reset}>
          {m.common.retry}
        </Button>
        {/* A full page load, so a broken client state is thrown away. */}
        <Button variant="outline" asChild>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full reload is the point here */}
          <a href="/dashboard">{m.common.backHome}</a>
        </Button>
      </div>
    </main>
  );
}
