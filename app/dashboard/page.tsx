import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth/actions";
import { requireOwner } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder until Step 6 builds the full dashboard.
export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <Suspense fallback={<div className="h-24" aria-busy="true" />}>
        <Welcome />
      </Suspense>
    </main>
  );
}

async function Welcome() {
  const owner = await requireOwner("/dashboard");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome{owner.fullName ? `, ${owner.fullName}` : ""}</h1>
      <p className="text-muted-foreground">
        Signed in as {owner.email}. Business: {owner.businessName || "not named yet"}.
      </p>
      <form action={logout}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
