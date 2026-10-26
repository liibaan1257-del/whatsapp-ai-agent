"use client";

import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Fragment, useActionState, useState } from "react";
import { Field } from "@/components/auth/field";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { resendConfirmation, signup, type AuthState } from "@/lib/auth/actions";

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
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  // Kept so "resend" can prove it's the owner (the server checks the password).
  const [password, setPassword] = useState("");

  if (state.notice) return <CheckEmail notice={state.notice} email={email} password={password} />;

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
        id="businessName"
        label={m.knowledge.businessName}
        placeholder={m.knowledge.businessNamePlaceholder}
        autoComplete="organization"
        maxLength={120}
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        error={state.fieldErrors?.businessName}
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
        value={password}
        onChange={(e) => setPassword(e.target.value)}
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

/** After sign-up: where the link went, where to look for it, and a way to send it again. */
function CheckEmail({ notice, email, password }: { notice: string; email: string; password: string }) {
  const { m } = useI18n();
  const [resent, resend, resending] = useActionState<AuthState, FormData>(resendConfirmation, {});
  const gmail = /@(gmail|googlemail)\.com$/i.test(email.trim());
  return (
    <div role="status" className="space-y-4 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand/15 text-brand">
        <MailCheck className="size-7" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold">{m.auth.checkEmailTitle}</h2>
      <p className="text-sm">{notice}</p>
      <p className="rounded-md border border-brand/30 bg-brand/10 px-3 py-2 text-sm">{m.auth.checkEmailSpam}</p>
      {gmail ? (
        <Button variant="brand" className="w-full" asChild>
          <a href="https://mail.google.com/mail/u/0/#search/ReplyBooker" target="_blank" rel="noopener noreferrer">
            {m.auth.openGmail}
          </a>
        </Button>
      ) : null}
      <form action={resend}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="password" value={password} />
        <Button type="submit" variant="outline" className="w-full" disabled={resending || !email || !password}>
          {resending ? m.auth.resendingConfirmation : m.auth.resendConfirmation}
        </Button>
      </form>
      {resent.notice ? <p className="text-sm text-muted-foreground">{resent.notice}</p> : null}
      {resent.error ? (
        <p role="alert" className="text-sm text-destructive">
          {resent.error}
        </p>
      ) : null}
    </div>
  );
}
