"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isPrivatePath } from "@/lib/analytics";

const KEY = "rb_session";

/** A random id kept for this browser tab only (sessionStorage, no cookie). */
function sessionId(): { id: string; first: boolean } {
  try {
    const saved = sessionStorage.getItem(KEY);
    if (saved) return { id: saved, first: false };
    const id = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => (b % 36).toString(36)).join("");
    sessionStorage.setItem(KEY, id);
    return { id, first: true };
  } catch {
    return { id: "", first: true };
  }
}

/** Sends one first-party page view per public page (see app/api/track). */
export function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const path = pathname ?? "/";
    if (isPrivatePath(path)) return;
    const { id, first } = sessionId();
    const body = JSON.stringify({
      path,
      session: id || undefined,
      // Where the visit came from: only meaningful on the first page of the visit.
      referrer: first ? document.referrer : "",
      utm: new URLSearchParams(location.search).get("utm_source") ?? "",
    });
    try {
      if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
        void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
      }
    } catch {
      // Measuring must never break the page.
    }
  }, [pathname]);

  return null;
}
