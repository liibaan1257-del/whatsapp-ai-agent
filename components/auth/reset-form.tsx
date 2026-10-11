"use client";

import { useActionState } from "react";
import { Field } from "@/components/auth/field";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { updatePassword, type AuthState } from "@/lib/auth/actions";

export function ResetForm() {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field id="password" label={m.auth.newPassword} type="password" autoComplete="new-password" required minLength={8} error={state.fieldErrors?.password} />
      <Field id="repeat" label={m.auth.repeatPassword} type="password" autoComplete="new-password" required minLength={8} />
      {state.error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? m.common.saving : m.auth.savePassword}
      </Button>
    </form>
  );
}
