"use client";

import Link from "next/link";
import { Fragment, useActionState, useState } from "react";
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
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [showWhatsapp, setShowWhatsapp] = useState(false);

  if (state.notice) {
    return (
      <p role="status" className="rounded-md border border-brand/30 bg-brand/10 px-3 py-3 text-sm">
        {state.notice}
      </p>
    );
  }

  return (
    // Only email + password are required to create the account; the business
    // name and other details are collected later in the dashboard. Keeping the
    // form this short is deliberate: cold visitors from ads abandon long forms.
    <form action={(fd) => action(withTimeZone(fd))} className="space-y-4" noValidate>
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
      {showWhatsapp ? (
        <div className="space-y-1">
          <Field
            id="whatsapp"
            label={m.auth.whatsapp}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="+252 61 234 5678"
            maxLength={40}
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            error={state.fieldErrors?.whatsapp}
          />
          {!state.fieldErrors?.whatsapp && <p className="text-xs text-muted-foreground">{m.auth.whatsappHint}</p>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowWhatsapp(true)}
          className="text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          {m.auth.addWhatsappOptional}
        </button>
      )}
      {state.error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? m.auth.creatingAccount : m.auth.createAccount}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {/* "By creating an account you agree to the {terms} and the {privacy}." with links */}
        {m.terms.agree.split(/(\{terms\}|\{privacy\})/).map((part, i) =>
          part === "{terms}" ? (
            <Link key={i} href="/terms" className="underline underline-offset-4 hover:text-foreground">
              {m.terms.link}
            </Link>
          ) : part === "{privacy}" ? (
            <Link key={i} href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              {m.common.privacy}
            </Link>
          ) : (
            <Fragment key={i}>{part}</Fragment>
          ),
        )}
      </p>
    </form>
  );
}
