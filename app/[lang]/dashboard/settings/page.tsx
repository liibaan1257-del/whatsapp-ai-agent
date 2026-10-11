import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DeleteAccount } from "@/components/settings/delete-account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/session";
import { getMessages, type Messages } from "@/lib/i18n/dictionaries";
import { localeFrom } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/dashboard/settings">): Promise<Metadata> {
  return { title: getMessages(localeFrom((await params).lang)).settings.title };
}

export default async function SettingsPage({ params }: PageProps<"/[lang]/dashboard/settings">) {
  const m = getMessages(localeFrom((await params).lang));
  return (
    <>
      <PageHeader title={m.settings.title} description={m.settings.description} />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <Settings m={m} />
      </Suspense>
    </>
  );
}

async function Settings({ m }: { m: Messages }) {
  const owner = await requireOwner("/dashboard/settings");
  const t = m.settings;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.account}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">{t.email}</dt>
            <dd className="min-w-0 break-all" dir="ltr">
              {owner.email}
            </dd>
            <dt className="text-muted-foreground">{t.name}</dt>
            <dd>{owner.fullName || "—"}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.data}</CardTitle>
          <CardDescription>{t.dataHint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Button variant="outline" asChild>
            {/* A plain link: the browser downloads the file. */}
            <a href="/api/account/export" download>
              <Download aria-hidden="true" />
              {t.export}
            </a>
          </Button>
          <Link href="/privacy" className="text-sm underline-offset-4 hover:underline">
            {m.common.privacy}
          </Link>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">{t.danger}</CardTitle>
          <CardDescription>{t.dangerHint}</CardDescription>
        </CardHeader>
        <CardContent>{owner.email ? <DeleteAccount email={owner.email} /> : null}</CardContent>
      </Card>
    </div>
  );
}
