"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/auth/field";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { requestPasswordReset, type AuthState } from "@/lib/auth/actions";

export function ForgotForm({ initialError }: { initialError?: string }) {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, { error: initialError });
  const [email, setEmail] = useState("");

  if (state.notice) {
    return (
      <p role="status" className="rounded-md border border-brand/30 bg-brand/10 px-3 py-3 text-sm">
        {state.notice}
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field
        id="email"
        label={m.auth.email}
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={state.fieldErrors?.email}
      />
      {state.error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? m.auth.sending : m.auth.sendLink}
      </Button>
    </form>
  );
}
