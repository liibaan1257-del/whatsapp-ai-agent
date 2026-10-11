"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/provider";
import { createClient } from "@/lib/supabase/client";

/**
 * Re-renders the page when this business's conversations, messages or
 * bookings change (Supabase Realtime; RLS limits events to the owner's data).
 */
export function LiveRefresh({ businessId, tables }: { businessId: string; tables: ("conversations" | "messages" | "bookings")[] }) {
  const router = useRouter();
  const { m } = useI18n();
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300); // batch bursts of events
    };

    (async () => {
      // Load the session from cookies first: subscribing before that would join
      // as an anonymous user, and RLS (correctly) rejects that.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) return setStatus("offline");
      await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;

      channel = supabase.channel(`dashboard-${businessId}`);
      for (const table of tables) {
        channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `business_id=eq.${businessId}` }, refresh);
      }
      channel.subscribe((s) => setStatus(s === "SUBSCRIBED" ? "live" : s === "CLOSED" || s === "CHANNEL_ERROR" ? "offline" : "connecting"));
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
    // `tables` is compared by value so a new array from a re-render doesn't resubscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, router, tables.join(",")]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
      <span className={`size-2 rounded-full ${status === "live" ? "bg-brand" : status === "offline" ? "bg-destructive" : "bg-amber-500"}`} />
      {status === "live" ? m.common.live : status === "offline" ? m.common.offline : m.common.connecting}
    </span>
  );
}
