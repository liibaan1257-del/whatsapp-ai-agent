"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut, Menu, MessageCircle, X } from "lucide-react";
import { NAV } from "@/components/dashboard/nav";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active ? "bg-brand/10 font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4", active && "text-brand")} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ businessName }: { businessName: string }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand">
        <MessageCircle className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold">{businessName || "Your business"}</span>
        <span className="block text-xs text-muted-foreground">WhatsApp AI Agent</span>
      </span>
    </Link>
  );
}

function SignOut({ email }: { email: string | null }) {
  return (
    <div className="space-y-2 border-t p-4">
      <p className="truncate text-xs text-muted-foreground" title={email ?? undefined}>
        {email}
      </p>
      <form action={logout}>
        <Button type="submit" variant="outline" size="sm" className="w-full">
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </form>
    </div>
  );
}

/** Sidebar layout for /dashboard; a drawer on small screens. */
export function DashboardShell({ owner, children }: { owner: { email: string | null; businessName: string }; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-background lg:flex">
        <div className="p-4">
          <Brand businessName={owner.businessName} />
        </div>
        <div className="flex-1 px-3">
          <NavLinks />
        </div>
        <SignOut email={owner.email} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r bg-background">
            <div className="flex items-center justify-between p-4">
              <Brand businessName={owner.businessName} />
              <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>
            <div className="flex-1 px-3">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <SignOut email={owner.email} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu />
          </Button>
          <Brand businessName={owner.businessName} />
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
