"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut, Menu, MessageCircle, X } from "lucide-react";
import { NAV } from "@/components/dashboard/nav";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useI18n } from "@/components/i18n/provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { m } = useI18n();
  return (
    <nav aria-label={m.nav.label} className="flex flex-col gap-1">
      {NAV.map(({ href, key, icon: Icon, exact }) => {
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
            {m.nav[key]}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ businessName }: { businessName: string }) {
  const { m } = useI18n();
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand">
        <MessageCircle className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold">{businessName || m.common.yourBusiness}</span>
        <span className="block text-xs text-muted-foreground">WhatsApp AI Agent</span>
      </span>
    </Link>
  );
}

function SignOut({ email }: { email: string | null }) {
  const { m } = useI18n();
  return (
    <div className="space-y-3 border-t p-4">
      <LanguageSwitcher />
      <ThemeToggle />
      <p className="truncate text-xs text-muted-foreground" title={email ?? undefined}>
        {email}
      </p>
      <form action={logout}>
        <Button type="submit" variant="outline" size="sm" className="w-full">
          <LogOut aria-hidden="true" className="rtl:rotate-180" />
          {m.auth.signOut}
        </Button>
      </form>
    </div>
  );
}

/** Sidebar layout for /dashboard; a drawer on small screens. */
export function DashboardShell({ owner, children }: { owner: { email: string | null; businessName: string }; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { m } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 start-0 hidden w-60 flex-col border-e bg-background lg:flex">
        <div className="p-4">
          <Brand businessName={owner.businessName} />
        </div>
        <div className="flex-1 px-3">
          <NavLinks />
        </div>
        <SignOut email={owner.email} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={m.nav.menu}>
          <button type="button" aria-label={m.nav.closeMenu} className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-e bg-background">
            <div className="flex items-center justify-between p-4">
              <Brand businessName={owner.businessName} />
              <Button variant="ghost" size="icon" aria-label={m.nav.closeMenu} onClick={() => setOpen(false)}>
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

      <div className="flex min-w-0 flex-1 flex-col lg:ps-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" aria-label={m.nav.openMenu} onClick={() => setOpen(true)}>
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
