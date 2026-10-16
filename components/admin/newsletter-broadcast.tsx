"use client";

import { useActionState } from "react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fmt } from "@/lib/i18n/config";
import { sendNewsletter, type BroadcastState } from "@/lib/newsletter/actions";

/** Operator: write and send a newsletter to all confirmed subscribers. */
export function NewsletterBroadcast({ count }: { count: number }) {
  const { m } = useI18n();
  const t = m.admin;
  const [state, action, pending] = useActionState<BroadcastState, FormData>(sendNewsletter, {});
  if (state.ok) return <p role="status" className="text-sm text-brand">{state.notice}</p>;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(t.broadcastConfirm)) e.preventDefault();
      }}
      className="grid gap-2"
    >
      <h3 className="text-sm font-medium">{t.broadcastTitle}</h3>
      <Input name="subject" required maxLength={150} placeholder={t.broadcastSubject} aria-label={t.broadcastSubject} />
      <Textarea name="body" required maxLength={10000} rows={6} placeholder={t.broadcastBody} aria-label={t.broadcastBody} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="brand" disabled={pending || count === 0}>
          {pending ? t.sending : fmt(t.broadcastSend, { n: count })}
        </Button>
        {state.error ? <span role="alert" className="text-sm text-destructive">{state.error}</span> : null}
      </div>
    </form>
  );
}
