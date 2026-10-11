import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

/** Centered card used by the login and sign-up pages. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/" className="mx-auto flex w-fit items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-brand/15 text-brand">
            <MessageCircle className="size-4" aria-hidden="true" />
          </span>
          WhatsApp AI Agent
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
          <CardFooter className="justify-center text-sm text-muted-foreground">{footer}</CardFooter>
        </Card>
        <div className="mx-auto w-48 space-y-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </main>
  );
}
