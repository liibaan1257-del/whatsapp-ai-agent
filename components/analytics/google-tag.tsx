"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Public Google tag ID (shown in page source by design; not a secret).
const TAG_ID = "G-XCZXRD8TJ5";

// Private areas: never load analytics there (business data, admin).
const PRIVATE = /^\/(?:[a-z]{2}\/)?(?:dashboard|admin|reset-password)(?:\/|$)/;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Loads the Google tag on public pages only. Loaded once per browser session
 * (the first public page); later client-side navigations are page views the
 * tag's enhanced measurement records from history changes.
 */
export function GoogleTag() {
  const pathname = usePathname();
  const isPrivate = PRIVATE.test(pathname ?? "/");

  useEffect(() => {
    if (isPrivate || document.getElementById("google-tag")) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", TAG_ID);
    const s = document.createElement("script");
    s.id = "google-tag";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${TAG_ID}`;
    document.head.appendChild(s);
  }, [isPrivate]);

  return null;
}
