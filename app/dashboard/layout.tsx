import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/shell";
import { requireOwner } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · WhatsApp AI Agent" },
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // The session is request data, so the gate renders inside Suspense.
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/30" aria-busy="true" aria-label="Loading" />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

/** Every dashboard page: signed in, with a business (checked on the server). */
async function Gate({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-sm space-y-2">
          <h1 className="text-lg font-semibold">Supabase is not configured</h1>
          <p className="text-sm text-muted-foreground">
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.
          </p>
        </div>
      </main>
    );
  }
  const owner = await requireOwner();
  return <DashboardShell owner={{ email: owner.email, businessName: owner.businessName }}>{children}</DashboardShell>;
}
