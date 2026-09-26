import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const isPrefetch =
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("x-middleware-prefetch") === "1";

  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname === "/shop/setup";
  const isGuestRoute = pathname === "/login" || pathname === "/register";

  // Fast path: Immediately bypass network calls for prefetch requests or public routes that don't need auth checks
  if (isPrefetch || (!isProtectedRoute && !isGuestRoute)) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // If Supabase environment variables are missing or invalid URL, continue safely
  if (
    !supabaseUrl ||
    !supabaseKey ||
    (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://"))
  ) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          } catch {
            // Ignore cookie mutations if headers were already sent
          }
        },
      },
    });

    // Refresh the session only for routes requiring auth verification
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protected routes: redirect unauthenticated users to login
    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Guest routes: redirect logged in users to dashboard
    if (user && isGuestRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error("Middleware Supabase updateSession error:", error);
  }

  return supabaseResponse;
}
