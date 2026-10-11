"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/auth/field";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { login, type AuthState } from "@/lib/auth/actions";

export function LoginForm({ next, initialError, notice }: { next: string; initialError?: string; notice?: string }) {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<AuthState, FormData>(login, { error: initialError });
  // Controlled so the email survives a failed attempt (forms reset after submit).
  const [email, setEmail] = useState("");

  return (
    <form action={action} className="space-y-4" noValidate>
      {notice ? (
        <p role="status" className="rounded-md border border-brand/30 bg-brand/10 px-3 py-2 text-sm">
          {notice}
        </p>
      ) : null}
      <input type="hidden" name="next" value={next} />
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
      <Field id="password" label={m.auth.password} type="password" autoComplete="current-password" required error={state.fieldErrors?.password} />
      {state.error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? m.auth.signingIn : m.auth.signIn}
      </Button>
    </form>
  );
}
