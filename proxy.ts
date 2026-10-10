import { NextResponse, type NextRequest } from "next/server";
import { DASHBOARD_HOME, LOGIN_PATH, SIGNUP_PATH } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/env";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Keeps the Supabase session fresh and redirects signed-out visitors away
 * from /dashboard. A UX layer only: dashboard pages check the user again on
 * the server (lib/auth/session.ts), and RLS protects the data itself.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isDashboard = pathname === DASHBOARD_HOME || pathname.startsWith(`${DASHBOARD_HOME}/`);
  const isAuthPage = pathname === LOGIN_PATH || pathname === SIGNUP_PATH;

  if (!isSupabaseConfigured()) return NextResponse.next();

  let session: Awaited<ReturnType<typeof updateSession>>;
  try {
    session = await updateSession(request);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "session_refresh_failed", error: String(error) }));
    return NextResponse.next();
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
