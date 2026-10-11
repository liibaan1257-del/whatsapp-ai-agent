import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/shell";
import { requireOwner } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";

export async function generateMetadata({ params }: LayoutProps<"/[lang]/dashboard">): Promise<Metadata> {
  const m = getMessages(localeFrom((await params).lang));
  return {
    title: { default: m.meta.dashboard, template: `%s · ${m.meta.appName}` },
    robots: { index: false, follow: false },
  };
}

export default async function DashboardLayout({ children, params }: LayoutProps<"/[lang]/dashboard">) {
  const m = getMessages(localeFrom((await params).lang));
  // The session is request data, so the gate renders inside Suspense.
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/30" aria-busy="true" aria-label={m.common.loading} />}>
      <Gate m={m}>{children}</Gate>
    </Suspense>
  );
}

/** Every dashboard page: signed in, with a business (checked on the server). */
async function Gate({ children, m }: { children: ReactNode; m: Messages }) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-sm space-y-2">
          <h1 className="text-lg font-semibold">{m.gate.notConfiguredTitle}</h1>
          <p className="text-sm text-muted-foreground">{m.gate.notConfiguredBody}</p>
        </div>
      </main>
    );
  }
  const owner = await requireOwner();
  return <DashboardShell owner={{ email: owner.email, businessName: owner.businessName }}>{children}</DashboardShell>;
}
