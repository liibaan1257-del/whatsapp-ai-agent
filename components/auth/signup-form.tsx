"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/auth/field";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { signup, type AuthState } from "@/lib/auth/actions";

/** The new business starts in the owner's own time zone (changeable later; the server falls back to UTC). */
function withTimeZone(fd: FormData): FormData {
  try {
    fd.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
  } catch {
    // Older browsers: no time zone sent.
  }
  return fd;
}

export function SignupForm() {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, {});
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  if (state.notice) {
    return (
      <p role="status" className="rounded-md border border-brand/30 bg-brand/10 px-3 py-3 text-sm">
        {state.notice}
      </p>
    );
  }

  return (
    <form action={(fd) => action(withTimeZone(fd))} className="space-y-4" noValidate>
      <Field
        id="fullName"
        label={m.auth.yourName}
        autoComplete="name"
        maxLength={100}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={state.fieldErrors?.fullName}
      />
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
      <Field
        id="password"
        label={m.auth.passwordNew}
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        error={state.fieldErrors?.password}
      />
      {state.error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? m.auth.creatingAccount : m.auth.createAccount}
      </Button>
    </form>
  );
}
