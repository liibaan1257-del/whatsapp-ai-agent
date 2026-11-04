"use client";

import { useActionState, useRef, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveLogo, type LogoState } from "@/lib/dashboard/logo-actions";

const SIZE = 256;

/** Shrinks the chosen image to a square-ish PNG of at most 256 px, as a data URL. */
async function toDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, SIZE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}

/** Upload or remove the business logo shown in the dashboard sidebar. */
export function LogoCard({ logo }: { logo: string | null }) {
  const { m } = useI18n();
  const t = m.logo;
  const [state, action, pending] = useActionState<LogoState, FormData>(saveLogo, {});
  const [preview, setPreview] = useState<string | null>(logo);
  const [readError, setReadError] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <Card id="logo">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.hint}</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={form} action={action} className="flex flex-wrap items-center gap-4">
          <input ref={field} type="hidden" name="logo" defaultValue={logo ?? ""} />
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border bg-muted">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL preview
              <img src={preview} alt="" className="size-full object-contain" />
            ) : (
              <ImageUp className="size-6 text-muted-foreground" aria-hidden="true" />
            )}
          </span>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            <ImageUp className="size-4" aria-hidden="true" />
            {pending ? t.saving : t.choose}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={pending}
              onChange={async (e) => {
                const file = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (!file || !field.current) return;
                try {
                  const url = await toDataUrl(file);
                  setReadError(false);
                  setPreview(url);
                  field.current.value = url;
                  form.current?.requestSubmit();
                } catch {
                  setReadError(true);
                }
              }}
            />
          </label>
          {preview ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (!field.current) return;
                setPreview(null);
                field.current.value = "";
                form.current?.requestSubmit();
              }}
            >
              <Trash2 aria-hidden="true" />
              {t.remove}
            </Button>
          ) : null}
          <span aria-live="polite" className="basis-full text-sm">
            {readError || state.error ? (
              <span className="text-destructive">{readError ? t.invalid : state.error}</span>
            ) : state.ok && !pending ? (
              <span className="text-brand">{t.saved}</span>
            ) : null}
          </span>
        </form>
      </CardContent>
    </Card>
  );
}
