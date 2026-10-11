import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { getMessages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/signup">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).auth.signupTitle };
}

export default async function SignupPage({ params }: PageProps<"/[lang]/signup">) {
  const m = getMessages(localeFrom((await params).lang));
  return (
    <AuthCard
      title={m.auth.signupTitle}
      description={m.auth.signupDescription}
      footer={
        <span>
          {m.auth.haveAccount}{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            {m.auth.signIn}
          </Link>
        </span>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
