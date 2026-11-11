"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Public Google tag ID (shown in page source by design; not a secret).
const TAG_ID = "G-XCZXRD8TJ5";
// Second GA4 stream for the same site (both receive the same page views).
const EXTRA_IDS = ["G-BSFRV0HFVB"];

// Private areas: never load analytics there (business data, admin).
const PRIVATE = /^\/(?:[a-z]{2}\/)?(?:dashboard|admin|reset-password)(?:\/|$)/;

const ALL_IDS = [TAG_ID, ...EXTRA_IDS];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

function pathOf(url: string | URL | null | undefined): string {
  try {
    return new URL(String(url ?? location.href), location.href).pathname;
  } catch {
    return location.pathname;
  }
}

/** GA's documented opt-out flag; checked when each hit is sent. */
function setDisabled(path: string) {
  const off = PRIVATE.test(path);
  for (const id of ALL_IDS) window[`ga-disable-${id}`] = off;
}

/**
 * Once the tag is loaded, wrap history so the opt-out flag is set *before*
 * GA's own history listener sees a navigation into a private area. Our wrapper
 * is installed after gtag.js, so it runs first and then calls gtag's wrapper.
 */
function guardHistory() {
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method];
    history[method] = function (this: History, data: unknown, unused: string, url?: string | URL | null) {
      setDisabled(pathOf(url));
      return original.call(this, data, unused, url);
    };
  }
  // Back/forward: capture listeners on window run before GA's.
  window.addEventListener("popstate", () => setDisabled(location.pathname), { capture: true });
}

/**
 * Loads the Google tag on public pages only. It is loaded once per browser
 * session (the first public page); later client-side navigations into the
 * dashboard/admin are blocked with GA's opt-out flag, so no private page view
 * (or conversation URL) is ever sent.
 */
export function GoogleTag() {
  const pathname = usePathname();
  const isPrivate = PRIVATE.test(pathname ?? "/");

  // Keep the opt-out flag in sync with the current page (also covers any
  // navigation the history guard missed).
  useEffect(() => {
    if (document.getElementById("google-tag")) setDisabled(pathname ?? "/");
  }, [pathname]);

  useEffect(() => {
    if (isPrivate || document.getElementById("google-tag")) return;
    setDisabled(location.pathname);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", TAG_ID);
    for (const id of EXTRA_IDS) window.gtag("config", id);
    const s = document.createElement("script");
    s.id = "google-tag";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${TAG_ID}`;
    s.onload = guardHistory;
    document.head.appendChild(s);
  }, [isPrivate]);

  return null;
}
