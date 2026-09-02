import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // If Supabase environment variables are missing or invalid URL, continue safely without throwing 500
  if (!supabaseUrl || !supabaseKey || (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://"))) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
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
      }
    );

    // Refresh the session — important for Server Components
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protected routes: redirect unauthenticated users to login
    const isProtectedRoute =
      request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname === "/shop/setup";

    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // If user is logged in and tries to access login/register, redirect to dashboard
    const isGuestRoute =
      request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/register";

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

