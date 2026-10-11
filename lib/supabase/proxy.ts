import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

/**
 * Refreshes the Supabase session cookie and reports whether the user is signed in.
 * `respond` builds the response (NextResponse.next, or a rewrite to a language).
 */
export async function updateSession(
  request: NextRequest,
  respond: (request: NextRequest) => NextResponse = (req) => NextResponse.next({ request: req }),
) {
  let response = respond(request);

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = respond(request);
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Never let a CDN cache a response that carries a session.
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Keep this right after client creation: it validates the JWT and refreshes it.
  const { data } = await supabase.auth.getClaims();
  return { response, isAuthenticated: Boolean(data?.claims?.sub) };
}
