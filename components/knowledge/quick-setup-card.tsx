"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { quickSetup, type QuickSetupState } from "@/lib/dashboard/quick-setup-actions";
import { fmt } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/** "Describe your business in a few sentences" → AI fills the knowledge base. */
export function QuickSetupCard({ highlight }: { highlight: boolean }) {
  const t = useI18n().m.quickSetup;
  const [state, action, pending] = useActionState<QuickSetupState, FormData>(quickSetup, {});
  return (
    <Card className={cn(highlight && "border-brand/50 bg-brand/5")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-brand" aria-hidden="true" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.hint}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <Textarea name="text" rows={5} maxLength={3000} placeholder={t.placeholder} aria-label={t.title} required minLength={20} disabled={pending} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="brand" disabled={pending}>
              <Sparkles aria-hidden="true" />
              {pending ? t.working : t.button}
            </Button>
            <p role="status" className={cn("text-sm", state.error ? "text-destructive" : "text-brand")}>
              {state.error ?? (state.ok && state.added ? fmt(t.done, { services: state.added.services, faqs: state.added.faqs }) : "")}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
