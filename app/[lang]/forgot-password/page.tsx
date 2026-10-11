import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotForm } from "@/components/auth/forgot-form";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/forgot-password">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).auth.forgotTitle };
}

export default async function ForgotPasswordPage({ params, searchParams }: PageProps<"/[lang]/forgot-password">) {
  const m = getMessages(localeFrom((await params).lang));
  return (
    <AuthCard
      title={m.auth.forgotTitle}
      description={m.auth.forgotDescription}
      footer={
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          {m.auth.backToLogin}
        </Link>
      }
    >
      <Suspense fallback={<div className="h-32" aria-busy="true" />}>
        <FormWithParams searchParams={searchParams} m={m} />
      </Suspense>
    </AuthCard>
  );
}

async function FormWithParams({ searchParams, m }: { searchParams: PageProps<"/[lang]/forgot-password">["searchParams"]; m: Messages }) {
  const params = await searchParams;
  return <ForgotForm initialError={params.error === "link_expired" ? m.auth.errors.linkExpired : undefined} />;
}
