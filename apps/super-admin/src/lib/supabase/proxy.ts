import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const VALET_SESSION_COOKIE = "valet_session";

export async function updateSession(request: NextRequest) {
  // Parking Admin / Valet Operator custom-auth routes: this is only a cheap
  // presence check (no DB lookup -- node:crypto/scrypt isn't available at
  // the edge). The real, DB-verified session check happens server-side in
  // the page/layout via getValetSession().
  if (request.nextUrl.pathname.startsWith("/parking-admin")) {
    const hasValetSession = Boolean(request.cookies.get(VALET_SESSION_COOKIE)?.value);
    const isValetLoginRoute = request.nextUrl.pathname === "/parking-admin/login";

    if (!hasValetSession && !isValetLoginRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/parking-admin/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/set-password");

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
