"use client";

import { useActionState, useState } from "react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount, type DeleteAccountState } from "@/lib/dashboard/account-actions";
import { fmt } from "@/lib/i18n/config";

/** Danger zone: the delete button only enables once the email is typed exactly. */
export function DeleteAccount({ email }: { email: string }) {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<DeleteAccountState, FormData>(deleteAccount, {});
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === email.toLowerCase();
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="confirm_email">{fmt(m.settings.confirmLabel, { email })}</Label>
        <Input
          id="confirm_email"
          name="confirm_email"
          type="email"
          autoComplete="off"
          dir="ltr"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="destructive" disabled={!matches || pending}>
          {pending ? m.settings.deleting : m.settings.deleteButton}
        </Button>
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
