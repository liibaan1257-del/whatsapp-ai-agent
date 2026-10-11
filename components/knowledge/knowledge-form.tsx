"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { describeBusiness } from "@/lib/ai/prompt";
import { useI18n } from "@/components/i18n/provider";
import { saveKnowledge, type KnowledgeState } from "@/lib/dashboard/knowledge-actions";
import { fmt } from "@/lib/i18n/config";
import { DAYS, type Day, type Faq, type Knowledge, type Service, type TimeFormat } from "@/lib/knowledge";
import { cn } from "@/lib/utils";

type Hours = Record<Day, { open: boolean; from: string; to: string }>;
type Status = { ai: boolean; whatsappWebhook: boolean; whatsappSend: boolean; serviceRole: boolean };

const select =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function toHours(k: Knowledge): Hours {
  return Object.fromEntries(
    DAYS.map((d) => {
      const h = k.working_hours[d];
      return [d, { open: Boolean(h), from: h?.open ?? "09:00", to: h?.close ?? "17:00" }];
    }),
  ) as Hours;
}

function ErrorText({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive">{msg}</p> : null;
}

export function KnowledgeForm({
  initial,
  timeZones,
  currencies,
  webhookUrl,
  status,
}: {
  initial: Knowledge;
  timeZones: string[];
  currencies: { code: string; label: string }[];
  webhookUrl: string;
  status: Status;
}) {
  const { m } = useI18n();
  const t = m.knowledge;
  const [name, setName] = useState(initial.business_name);
  const [description, setDescription] = useState(initial.description);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [currency, setCurrency] = useState(initial.currency);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(initial.time_format);
  const [aiEnabled, setAiEnabled] = useState(initial.ai_enabled);
  const [services, setServices] = useState<Service[]>(initial.services);
  const [hours, setHours] = useState<Hours>(() => toHours(initial));
  const [faqs, setFaqs] = useState<Faq[]>(initial.faqs);
  const [policy, setPolicy] = useState(initial.booking_policy);
  const [phoneId, setPhoneId] = useState(initial.whatsapp_phone_number_id ?? "");
  const [state, setState] = useState<KnowledgeState>({});
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const fe = state.fieldErrors ?? {};

  const payload = useMemo(
    () => ({
      business_name: name,
      description,
      timezone,
      currency,
      time_format: timeFormat,
      ai_enabled: aiEnabled,
      services,
      working_hours: Object.fromEntries(DAYS.map((d) => [d, hours[d].open ? { open: hours[d].from, close: hours[d].to } : null])),
      faqs,
      booking_policy: policy,
      whatsapp_phone_number_id: phoneId.trim() || null,
    }),
    [name, description, timezone, currency, timeFormat, aiEnabled, services, hours, faqs, policy, phoneId],
  );
  const preview = useMemo(() => describeBusiness({ ...(payload as unknown as Knowledge), id: initial.id }), [payload, initial.id]);

  function save() {
    setState({});
    startTransition(async () => setState(await saveKnowledge(payload)));
  }

  const updateService = (i: number, patch: Partial<Service>) => setServices((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const updateFaq = (i: number, patch: Partial<Faq>) => setFaqs((f) => f.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-6 pb-24"
      noValidate
    >
      <Card>
        <CardHeader>
          <CardTitle>{t.business}</CardTitle>
          <CardDescription>{t.businessHint}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="business_name">{t.businessName}</Label>
            <Input id="business_name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder={t.businessNamePlaceholder} />
            <ErrorText msg={fe.business_name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">{t.timezone}</Label>
            <select id="timezone" className={select} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {timeZones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <ErrorText msg={fe.timezone} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">{t.currency}</Label>
            <select id="currency" className={select} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <ErrorText msg={fe.currency} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time_format">{t.timeFormat}</Label>
            <select id="time_format" className={select} value={timeFormat} onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}>
              <option value="24h">{t.format24}</option>
              <option value="12h">{t.format12}</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">{t.about}</Label>
            <Textarea
              id="description"
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.aboutPlaceholder}
            />
          </div>
          <label className="flex items-start gap-3 md:col-span-2">
            <input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" />
            <span>
              <span className="block text-sm font-medium">{t.aiOn}</span>
              <span className="block text-xs text-muted-foreground">{t.aiOnHint}</span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.services}</CardTitle>
          <CardDescription>{t.servicesHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {services.length === 0 ? <p className="text-sm text-muted-foreground">{t.noServices}</p> : null}
          {services.map((s, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <div className="space-y-1">
                <Label htmlFor={`svc-name-${i}`} className="text-xs text-muted-foreground">{t.service}</Label>
                <Input id={`svc-name-${i}`} value={s.name} maxLength={100} onChange={(e) => updateService(i, { name: e.target.value })} placeholder={t.servicePlaceholder} aria-invalid={fe[`services.${i}.name`] ? true : undefined} />
                <ErrorText msg={fe[`services.${i}.name`]} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`svc-price-${i}`} className="text-xs text-muted-foreground">{t.price}</Label>
                <Input id={`svc-price-${i}`} value={s.price} maxLength={50} onChange={(e) => updateService(i, { price: e.target.value })} placeholder={`15 (${currency})`} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`svc-dur-${i}`} className="text-xs text-muted-foreground">{t.minutes}</Label>
                <Input
                  id={`svc-dur-${i}`}
                  type="number"
                  min={5}
                  max={1440}
                  step={5}
                  value={s.duration_minutes}
                  onChange={(e) => updateService(i, { duration_minutes: Number(e.target.value) })}
                  aria-invalid={fe[`services.${i}.duration_minutes`] ? true : undefined}
                />
                <ErrorText msg={fe[`services.${i}.duration_minutes`]} />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="ghost" size="icon" aria-label={fmt(t.remove, { name: s.name || t.serviceFallback })} onClick={() => setServices((x) => x.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </div>
              <div className="space-y-1 sm:col-span-4">
                <Label htmlFor={`svc-desc-${i}`} className="text-xs text-muted-foreground">{t.details}</Label>
                <Input id={`svc-desc-${i}`} value={s.description} maxLength={500} onChange={(e) => updateService(i, { description: e.target.value })} placeholder={t.detailsPlaceholder} />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={services.length >= 50}
            onClick={() => setServices((x) => [...x, { name: "", price: "", duration_minutes: 30, description: "" }])}
          >
            <Plus /> {t.addService}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.hours}</CardTitle>
          <CardDescription>{fmt(t.hoursHint, { tz: timezone })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {DAYS.map((d) => (
            <div key={d} className="flex flex-wrap items-center gap-3">
              <label className="flex w-32 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hours[d].open}
                  onChange={(e) => setHours((h) => ({ ...h, [d]: { ...h[d], open: e.target.checked } }))}
                  className="size-4 accent-[var(--brand)]"
                />
                {m.days[d]}
              </label>
              {hours[d].open ? (
                <>
                  <Input type="time" aria-label={fmt(t.opens, { day: m.days[d] })} className="w-32" value={hours[d].from} onChange={(e) => setHours((h) => ({ ...h, [d]: { ...h[d], from: e.target.value } }))} />
                  <span className="text-sm text-muted-foreground">{t.to}</span>
                  <Input type="time" aria-label={fmt(t.closes, { day: m.days[d] })} className="w-32" value={hours[d].to} onChange={(e) => setHours((h) => ({ ...h, [d]: { ...h[d], to: e.target.value } }))} />
                  <ErrorText msg={fe[`working_hours.${d}`] ?? fe[`working_hours.${d}.open`] ?? fe[`working_hours.${d}.close`]} />
                </>
              ) : (
                <span className="text-sm text-muted-foreground">{t.closed}</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.faqs}</CardTitle>
          <CardDescription>{t.faqsHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {faqs.length === 0 ? <p className="text-sm text-muted-foreground">{t.noFaqs}</p> : null}
          {faqs.map((f, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`faq-q-${i}`} className="text-xs text-muted-foreground">{t.question}</Label>
                  <Input id={`faq-q-${i}`} value={f.question} maxLength={300} onChange={(e) => updateFaq(i, { question: e.target.value })} placeholder={t.questionPlaceholder} aria-invalid={fe[`faqs.${i}.question`] ? true : undefined} />
                  <ErrorText msg={fe[`faqs.${i}.question`]} />
                </div>
                <Button type="button" variant="ghost" size="icon" className="mt-5" aria-label={t.removeFaq} onClick={() => setFaqs((x) => x.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`faq-a-${i}`} className="text-xs text-muted-foreground">{t.answer}</Label>
                <Textarea id={`faq-a-${i}`} value={f.answer} maxLength={2000} onChange={(e) => updateFaq(i, { answer: e.target.value })} placeholder={t.answerPlaceholder} aria-invalid={fe[`faqs.${i}.answer`] ? true : undefined} />
                <ErrorText msg={fe[`faqs.${i}.answer`]} />
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={faqs.length >= 50} onClick={() => setFaqs((x) => [...x, { question: "", answer: "" }])}>
            <Plus /> {t.addFaq}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.policy}</CardTitle>
          <CardDescription>{t.policyHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="booking_policy" className="sr-only">{t.policy}</Label>
          <Textarea
            id="booking_policy"
            value={policy}
            maxLength={3000}
            onChange={(e) => setPolicy(e.target.value)}
            placeholder={t.policyPlaceholder}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.whatsapp}</CardTitle>
          <CardDescription>{t.whatsappHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp_phone_number_id">{t.phoneId}</Label>
            <Input id="whatsapp_phone_number_id" inputMode="numeric" value={phoneId} onChange={(e) => setPhoneId(e.target.value.replace(/\s/g, ""))} placeholder={t.phoneIdPlaceholder} className="max-w-xs" aria-invalid={fe.whatsapp_phone_number_id ? true : undefined} />
            <ErrorText msg={fe.whatsapp_phone_number_id} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook_url">{t.callbackUrl}</Label>
            <div className="flex max-w-xl gap-2">
              <Input id="webhook_url" dir="ltr" readOnly value={webhookUrl} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t.copyCallback}
                onClick={() => {
                  void navigator.clipboard?.writeText(webhookUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t.verifyHint}</p>
          </div>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {[
              [t.statusAi, status.ai],
              [t.statusDb, status.serviceRole],
              [t.statusWebhook, status.whatsappWebhook],
              [t.statusSend, status.whatsappSend],
            ].map(([label, ok]) => (
              <li key={String(label)} className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", ok ? "bg-brand" : "bg-destructive")} aria-hidden="true" />
                <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
                <span className="sr-only">{ok ? t.isSet : t.isMissing}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <details className="rounded-xl border bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium">{t.preview}</summary>
        <pre dir="ltr" className="mt-3 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{preview}</pre>
      </details>

      <div className="fixed start-0 end-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur lg:start-60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Button type="submit" variant="brand" disabled={pending}>
            {pending ? m.common.saving : t.save}
          </Button>
          <span aria-live="polite" className="text-sm">
            {state.error ? (
              <span role="alert" className="text-destructive">{state.error}</span>
            ) : state.ok && !pending ? (
              <span className="text-brand">{t.saved}</span>
            ) : null}
          </span>
        </div>
      </div>
    </form>
  );
}
