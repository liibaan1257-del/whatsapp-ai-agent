import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { getMessages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";
import { isReferralCode, REFERRAL_COOKIE } from "@/lib/referral";

export async function generateMetadata({ params }: PageProps<"/[lang]/signup">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).auth.signupTitle };
}

export default async function SignupPage({ params, searchParams }: PageProps<"/[lang]/signup">) {
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
      <Suspense fallback={null}>
        <InviteBonus searchParams={searchParams} text={m.auth.referralBonus} />
      </Suspense>
      <SignupForm />
    </AuthCard>
  );
}

/** "You were invited" when ?ref= is on this visit (the cookie is only set on the response) or kept from an earlier page. */
async function InviteBonus({ searchParams, text }: { searchParams: PageProps<"/[lang]/signup">["searchParams"]; text: string }) {
  const ref = (await searchParams).ref;
  const invited = isReferralCode(typeof ref === "string" ? ref.toLowerCase() : null) || isReferralCode((await cookies()).get(REFERRAL_COOKIE)?.value);
  if (!invited) return null;
  return (
    <p role="status" className="mb-4 rounded-md border border-brand/30 bg-brand/10 px-3 py-2 text-sm">
      🎁 {text}
    </p>
  );
}
