"use client";

import { useActionState, useState } from "react";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { quickSetup, type QuickSetupState } from "@/lib/dashboard/quick-setup-actions";
import { cn } from "@/lib/utils";

type Kind = "shop" | "restaurant" | "salon" | "phoneRepair" | "clinic" | "cargo" | "other";
const KINDS: { kind: Kind; emoji: string }[] = [
  { kind: "shop", emoji: "🛒" },
  { kind: "restaurant", emoji: "🍛" },
  { kind: "salon", emoji: "💇‍♀️" },
  { kind: "phoneRepair", emoji: "📱" },
  { kind: "clinic", emoji: "🏥" },
  { kind: "cargo", emoji: "📦" },
  { kind: "other", emoji: "➕" },
];

/**
 * First thing a new owner sees on the dashboard while the bot knows nothing:
 * pick a business type, edit a ready example, and the AI fills the knowledge
 * base (same action as Quick setup). Then straight to the Chat tester.
 */
export function StartWizard() {
  const t = useI18n().m.onboarding;
  const [kind, setKind] = useState<Kind | null>(null);
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState<QuickSetupState, FormData>(quickSetup, {});

  const choose = (k: Kind) => {
    setKind(k);
    setText(t.examples[k]);
  };

  return (
    <Card className="mb-6 border-brand/50 bg-brand/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="size-5 text-brand" aria-hidden="true" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">{t.step1}</p>
          <div className="flex flex-wrap gap-2">
            {KINDS.map(({ kind: k, emoji }) => (
              <button
                key={k}
                type="button"
                onClick={() => choose(k)}
                aria-pressed={kind === k}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  kind === k ? "border-brand bg-brand text-brand-foreground" : "bg-background hover:border-brand",
                )}
              >
                <span aria-hidden="true">{emoji}</span> {t.kinds[k]}
              </button>
            ))}
          </div>
        </div>

        {kind ? (
          <form action={action} className="space-y-3">
            <input type="hidden" name="then" value="chat-test" />
            <div>
              <p className="text-sm font-medium">{t.step2}</p>
              <p className="mb-2 text-xs text-muted-foreground">{t.step2Hint}</p>
              <Textarea
                name="text"
                rows={6}
                maxLength={3000}
                minLength={20}
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={pending}
                aria-label={t.step2}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="brand" size="lg" disabled={pending || text.trim().length < 20}>
                <Sparkles aria-hidden="true" />
                {pending ? t.working : t.button}
              </Button>
              {state.error ? (
                <p role="alert" className="text-sm text-destructive">
                  {state.error}
                </p>
              ) : state.ok ? (
                <p role="status" className="text-sm text-brand">
                  {t.done}
                </p>
              ) : null}
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
