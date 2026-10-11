"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { CalendarCheck, RotateCcw, SendHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { resetTestConversation } from "@/lib/dashboard/actions";
import { useI18n } from "@/components/i18n/provider";
import { fmt } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

export type TestMessage = { id: string; role: "customer" | "assistant"; content: string; intent?: string | null; bookingId?: string | null };

const MAX = 4000;

/** Simulates a WhatsApp customer chatting with the AI agent. */
export function ChatTester({ initial, businessName }: { initial: TestMessage[]; businessName: string }) {
  const { m: t } = useI18n();
  const [messages, setMessages] = useState<TestMessage[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, startReset] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [messages, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setError(null);
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { id: `c-${Date.now()}`, role: "customer", content: message }]);
    try {
      const res = await fetch("/api/chat-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? fmt(t.chat.requestFailed, { status: res.status }));
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: data.reply, intent: data.intent, bookingId: data.bookingId }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.chat.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-brand/10 py-3">
        <CardTitle className="text-base">{businessName || t.common.yourBusiness} · WhatsApp</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={resetting || busy || messages.length === 0}
          onClick={() =>
            startReset(async () => {
              await resetTestConversation();
              setMessages([]);
              setError(null);
            })
          }
        >
          <RotateCcw aria-hidden="true" />
          {t.chat.reset}
        </Button>
      </CardHeader>

      <CardContent className="h-[calc(100dvh-22rem)] min-h-[320px] space-y-3 overflow-y-auto bg-muted/30 py-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-md py-6 text-center">
            <p className="text-sm font-medium">{t.chat.emptyTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.chat.emptyHint}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {t.chat.examples.map((ex) => (
                <Button key={ex} type="button" variant="outline" size="sm" className="h-auto py-1.5 whitespace-normal" onClick={() => void send(ex)}>
                  {ex}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "customer" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-xl px-3.5 py-2 text-sm whitespace-pre-wrap shadow-xs", m.role === "customer" ? "bg-brand/20" : "bg-background")}>
              <span className="sr-only">{m.role === "customer" ? t.chat.you : t.chat.agent} </span>
              {m.content}
              {m.role === "assistant" && (m.intent || m.bookingId) ? (
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {m.intent ? <Badge variant="secondary">{fmt(t.chat.intent, { intent: t.intent[m.intent as keyof Messages["intent"]] ?? m.intent })}</Badge> : null}
                  {m.bookingId ? (
                    <Badge variant="brand" asChild>
                      <Link href="/dashboard/bookings">
                        <CalendarCheck aria-hidden="true" /> {t.chat.bookingSaved}
                      </Link>
                    </Badge>
                  ) : null}
                </span>
              ) : null}
            </div>
          </div>
        ))}
        {busy ? (
          <div className="flex justify-start">
            <div className="rounded-xl bg-background px-3.5 py-2 text-sm text-muted-foreground shadow-xs">
              <span className="animate-pulse">{t.chat.typing}</span>
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-2 border-t py-3">
        {error ? (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            {t.chat.message}
          </label>
          <Textarea
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX))}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={t.chat.placeholder}
            className="max-h-32 min-h-10"
          />
          <Button type="submit" variant="brand" size="icon" aria-label={t.chat.send} disabled={busy || !input.trim()}>
            <SendHorizontal className="rtl:rotate-180" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
