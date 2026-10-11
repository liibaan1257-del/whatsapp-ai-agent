import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "@/components/auth/reset-form";
import { isSupabaseConfigured } from "@/lib/env";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/reset-password">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).auth.resetTitle, robots: { index: false } };
}

export default async function ResetPasswordPage({ params }: PageProps<"/[lang]/reset-password">) {
  const m = getMessages(localeFrom((await params).lang));
  return (
    <AuthCard
      title={m.auth.resetTitle}
      description={m.auth.resetDescription}
      footer={
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          {m.auth.backToLogin}
        </Link>
      }
    >
      <Suspense fallback={<div className="h-40" aria-busy="true" />}>
        <Gate m={m} />
      </Suspense>
    </AuthCard>
  );
}

/** Only someone who arrived through a valid reset link (now signed in) gets the form. */
async function Gate({ m }: { m: Messages }) {
  const signedIn = isSupabaseConfigured() && Boolean((await (await createClient()).auth.getClaims()).data?.claims?.sub);
  if (!signedIn) {
    return (
      <p role="alert" className="text-sm">
        {m.auth.errors.linkExpired}{" "}
        <Link href="/forgot-password" className="font-medium underline underline-offset-4">
          {m.auth.forgot}
        </Link>
      </p>
    );
  }
  return <ResetForm />;
}
