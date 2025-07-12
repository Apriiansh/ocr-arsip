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

    // Kita tetap memanggil getUser() untuk me-refresh sesi jika ada,
    // tapi logika redirect akan diubah.
    await supabase.auth.getUser();

    // Rute autentikasi (pengguna yang sudah login akan dialihkan dari sini)
    const authRoutes = ["/sign-in"]; // Hanya /sign-in yang dianggap rute auth utama
    const publicRoutes = ["/sign-in", "/sign-up", "/user-manual"]; // Rute yang bisa diakses tanpa login
    
    // Paths yang tidak perlu redirectedFrom parameter
    const rootPaths = ["/", ""]; // Root paths yang langsung redirect ke sign-in tanpa parameter
    
    // Paths yang dianggap sebagai "landing pages" atau entry points
    const entryPaths = ["/", "/user", "/unit-pengolah", "/unit-kearsipan", "/kepala-dinas", "/admin"]; // Paths yang tidak perlu redirectedFrom

    // Make auth route check more precise
    const isAuthRoute = authRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
    const isRootPath = rootPaths.includes(pathname);
    const isEntryPath = entryPaths.includes(pathname);

    // Jika pengguna mencoba mengakses halaman sign-in, biarkan saja.
    if (isAuthRoute) {
      return response;
    }

    // Jika bukan rute publik dan bukan rute sign-in,
    // selalu coba ambil sesi pengguna. Jika tidak ada sesi, redirect ke sign-in.
    if (!isPublicRoute) {
      const { data: { session } } = await supabase.auth.getSession();
      // Untuk root dan entry path, JANGAN redirect dari middleware, biarkan client-side yang handle
      if (!session && !isRootPath && !isEntryPath && pathname !== "/favicon.ico" && !pathname.startsWith("/_next")) {
        const redirectUrl = new URL("/sign-in", request.url);
        redirectUrl.searchParams.set('redirectedFrom', pathname);
        return NextResponse.redirect(redirectUrl);
      }
      // Untuk root/entry path, biarkan lewat (client-side akan handle redirect jika perlu)
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