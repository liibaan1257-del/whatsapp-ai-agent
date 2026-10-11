"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { deleteConversation, type DeleteConversationState } from "@/lib/dashboard/actions";

/** Erase one customer's conversation (asks first). */
export function DeleteConversation({ id }: { id: string }) {
  const { m } = useI18n();
  const [state, action, pending] = useActionState<DeleteConversationState, FormData>(deleteConversation, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(m.conversation.deleteConfirm)) e.preventDefault();
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={pending}>
        <Trash2 aria-hidden="true" />
        {m.conversation.delete}
      </Button>
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
