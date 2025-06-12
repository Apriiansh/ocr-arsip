import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  try {
    // Use const for response as it is never reassigned
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options),
              );
            } catch (_error) {
              console.error("Middleware: Gagal mengatur cookie pada response:", _error);
            }
          },
        },
      },
    );

    // This will refresh session if expired - required for Server Components
    const { pathname } = request.nextUrl;

    const { data: { user }, error: getUserError } = await supabase.auth.getUser();

    // Rute autentikasi (pengguna yang sudah login akan dialihkan dari sini)
    const authRoutes = ["/sign-in", "/sign-up"];
    // Daftar path yang memerlukan otentikasi
    const protectedRoutes = [
      "/unit-pengolah",
      "/unit-kearsipan",
      "/arsip",
      "/notifikasi",
      "/user",
      "/admin",
      "/kepala-dinas",
      "/settings",
    ];

    // Make auth route check more precise
    const isAuthRoute = authRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
    const isProtectedRoute = protectedRoutes.some(route => {
      // For /user, only match /user or /user/*, to prevent /user-manual from being protected
      if (route === "/user") return pathname === "/user" || pathname.startsWith("/user/");
      return pathname.startsWith(route);
    });

    if (getUserError && getUserError.message === 'fetch failed') {
      // Jika fetch failed, biarkan akses ke rute non-protected
      // Rute terproteksi akan tetap diblokir oleh !user di bawah
      // Optionally log the error:
      // console.error(`Middleware (${pathname}): supabase.auth.getUser() gagal dengan "fetch failed".`);
    }

    if (isAuthRoute) {
      if (user && !getUserError) {
        // Jika user sudah login dan akses halaman auth, redirect ke home
        return NextResponse.redirect(new URL("/", request.url));
      }
      return response;
    }

    if (isProtectedRoute) {
      if (!user) {
        // Jika belum login dan akses halaman terproteksi, redirect ke sign-in
        const redirectUrl = new URL("/sign-in", request.url);
        redirectUrl.searchParams.set('redirectedFrom', pathname);
        return NextResponse.redirect(redirectUrl);
      }
    }

    return response;
  } catch (e) {
    const error = e as Error;
    console.error(
      `CRITICAL ERROR in Supabase middleware for path: ${request.nextUrl.pathname}:`,
      error.message,
      error.stack
    );
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};