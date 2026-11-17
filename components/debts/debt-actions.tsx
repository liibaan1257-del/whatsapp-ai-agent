"use client";

import { useRef } from "react";
import { Check, MessageCircle, RotateCcw, Trash2 } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { updateDebt } from "@/lib/dashboard/debt-actions";

/**
 * Row actions. "Remind" opens the owner's own WhatsApp with a ready message
 * (wa.me), so nothing is sent by ReplyBooker and no template is needed, and
 * records when the reminder was last sent.
 */
export function DebtActions({ id, paid, remindLink }: { id: string; paid: boolean; remindLink: string | null }) {
  const t = useI18n().m.debts;
  const remindForm = useRef<HTMLFormElement>(null);
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {!paid && remindLink ? (
        <form ref={remindForm} action={updateDebt}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="op" value="reminded" />
          <Button variant="outline" size="sm" asChild>
            <a href={remindLink} target="_blank" rel="noopener noreferrer" onClick={() => remindForm.current?.requestSubmit()}>
              <MessageCircle aria-hidden="true" />
              {t.remind}
            </a>
          </Button>
        </form>
      ) : null}
      <form action={updateDebt}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="op" value={paid ? "open" : "paid"} />
        <Button type="submit" variant={paid ? "ghost" : "brand"} size="sm">
          {paid ? <RotateCcw aria-hidden="true" /> : <Check aria-hidden="true" />}
          {paid ? t.reopen : t.markPaid}
        </Button>
      </form>
      <form
        action={updateDebt}
        onSubmit={(e) => {
          if (!window.confirm(t.deleteConfirm)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="op" value="delete" />
        <Button type="submit" variant="ghost" size="sm" aria-label={t.delete} title={t.delete}>
          <Trash2 aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
