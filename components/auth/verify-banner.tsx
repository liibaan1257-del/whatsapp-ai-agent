"use client";

import { MailCheck } from "lucide-react";
import { useActionState } from "react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { resendVerification, type AuthState } from "@/lib/auth/actions";
import { fmt } from "@/lib/i18n/config";

/** Dashboard banner until the owner opens the emailed link (needed before connecting WhatsApp). */
export function VerifyBanner({ email }: { email: string | null }) {
  const { m } = useI18n();
  const [state, resend, pending] = useActionState<AuthState, FormData>(resendVerification, {});
  const gmail = /@(gmail|googlemail)\.com$/i.test(email ?? "");
  return (
    <div role="status" className="mb-6 flex flex-col gap-3 rounded-xl border border-brand/40 bg-brand/10 p-4 sm:flex-row sm:items-center">
      <MailCheck className="size-6 shrink-0 text-brand" aria-hidden="true" />
      <div className="flex-1 text-sm">
        <p className="font-medium">{fmt(m.auth.verifyBanner, { email: email ?? "" })}</p>
        <p className="mt-1 text-muted-foreground">{state.notice ?? state.error ?? m.auth.checkEmailSpam}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {gmail ? (
          <Button variant="brand" size="sm" asChild>
            <a href="https://mail.google.com/mail/u/0/#search/ReplyBooker" target="_blank" rel="noopener noreferrer">
              {m.auth.openGmail}
            </a>
          </Button>
        ) : null}
        <form action={resend}>
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            {pending ? m.auth.resendingConfirmation : m.auth.resendConfirmation}
          </Button>
        </form>
      </div>
    </div>
  );
}
