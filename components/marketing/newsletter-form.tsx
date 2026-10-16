"use client";

import { useActionState } from "react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribe, type NewsletterState } from "@/lib/newsletter/actions";

/** Website newsletter signup (double opt-in: the server emails a confirmation link). */
export function NewsletterForm() {
  const { m } = useI18n();
  const t = m.newsletter;
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribe, {});
  if (state.ok) {
    return (
      <p role="status" className="rounded-lg border border-brand/40 bg-brand/10 p-3 text-sm">
        {t.done}
      </p>
    );
  }
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <label htmlFor="newsletter_email" className="sr-only">
          Email
        </label>
        <Input id="newsletter_email" name="email" type="email" required autoComplete="email" dir="ltr" placeholder={t.placeholder} className="max-w-xs flex-1" />
        {/* Honeypot: hidden from people, filled by bots. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? t.sending : t.submit}
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{t.consent}</p>
      )}
    </form>
  );
}
