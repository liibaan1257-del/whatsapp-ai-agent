import { NextResponse, type NextRequest } from "next/server";
import { DASHBOARD_HOME, LOGIN_PATH, SIGNUP_PATH } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/env";
import { isLocale, LOCALE_COOKIE, matchLocale } from "@/lib/i18n/config";
import { isReferralCode, REFERRAL_COOKIE } from "@/lib/referral";
import { updateSession } from "@/lib/supabase/proxy";

const YEAR = 60 * 60 * 24 * 365;

/**
 * 1. Language: serves /<lang>/… internally (from the `lang` cookie, else the
 *    browser's languages) so URLs stay the same. /fr/dashboard-style links set
 *    the language and redirect to the clean URL.
 * 2. Keeps the Supabase session fresh and redirects signed-out visitors away
 *    from /dashboard. A UX layer only: dashboard pages check the user again on
 *    the server (lib/auth/session.ts), and RLS protects the data itself.
 */
export async function proxy(request: NextRequest) {
  return rememberReferral(request, await route(request));
}

/** ?ref=<code> on any page: keep the invite code for 30 days so it survives until signup. */
function rememberReferral(request: NextRequest, res: NextResponse) {
  const ref = request.nextUrl.searchParams.get("ref")?.toLowerCase();
  if (isReferralCode(ref)) res.cookies.set(REFERRAL_COOKIE, ref, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", httpOnly: true });
  return res;
}

async function route(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  const prefix = pathname.split("/")[1];
  if (isLocale(prefix)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(prefix.length + 1) || "/";
    const res = NextResponse.redirect(url);
    res.cookies.set(LOCALE_COOKIE, prefix, { path: "/", maxAge: YEAR, sameSite: "lax" });
    return res;
  }

  // Route handlers (email confirmation) have no language version.
  const localized = !pathname.startsWith("/auth/") && !pathname.startsWith("/_next/");
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : matchLocale(request.headers.get("accept-language"));
  const target = request.nextUrl.clone();
  target.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  const respond = (req: NextRequest) => (localized ? NextResponse.rewrite(target, { request: req }) : NextResponse.next({ request: req }));

  const isDashboard = pathname === DASHBOARD_HOME || pathname.startsWith(`${DASHBOARD_HOME}/`);
  const isAuthPage = pathname === LOGIN_PATH || pathname === SIGNUP_PATH;

  if (!isSupabaseConfigured()) return respond(request);

  let session: Awaited<ReturnType<typeof updateSession>>;
  try {
    session = await updateSession(request, respond);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "session_refresh_failed", error: String(error) }));
    return respond(request);
  }

  if (isDashboard && !session.isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return withCookies(NextResponse.redirect(url), session.response);
  }

  if (isAuthPage && session.isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = DASHBOARD_HOME;
    url.search = "";
    return withCookies(NextResponse.redirect(url), session.response);
  }

  return session.response;
}

function withCookies(redirect: NextResponse, from: NextResponse) {
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  redirect.headers.set("Cache-Control", "private, no-store");
  return redirect;
}

export const config = {
  // Pages only: skip API routes (the webhook has its own auth), static files and images.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|mp4)$).*)"],
};
