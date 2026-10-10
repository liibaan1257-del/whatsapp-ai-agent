"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { signup, type AuthState } from "@/lib/auth/actions";

export function SignupForm() {
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
    <form action={action} className="space-y-4" noValidate>
      <Field
        id="fullName"
        label="Your name"
        autoComplete="name"
        maxLength={100}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={state.fieldErrors?.fullName}
      />
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={state.fieldErrors?.email}
      />
      <Field
        id="password"
        label="Password (8+ characters)"
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
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
