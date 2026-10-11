import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/auth/redirect";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/login">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).auth.signInTitle };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[lang]/login">) {
  const m = getMessages(localeFrom((await params).lang));
  return (
    <AuthCard
      title={m.auth.signInTitle}
      description={m.auth.signInDescription}
      footer={
        <span>
          {m.auth.newHere}{" "}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            {m.auth.createAccountLink}
          </Link>
        </span>
      }
    >
      <Suspense fallback={<div className="h-56" aria-busy="true" />}>
        <LoginFormWithParams searchParams={searchParams} m={m} />
      </Suspense>
    </AuthCard>
  );
}

async function LoginFormWithParams({ searchParams, m }: { searchParams: PageProps<"/[lang]/login">["searchParams"]; m: Messages }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  const error = params.error === "confirm_failed" ? m.auth.confirmFailed : undefined;
  return <LoginForm next={next} initialError={error} />;
}
