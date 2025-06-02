import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  // This `try/catch` block is only here for the interactive tutorial.
  // Feel free to remove once you have Supabase connected.
  try {
    // Create an unmodified response
    let response = NextResponse.next({
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
            } catch (error) {
              // Ini adalah fallback jika ada masalah saat mengatur cookie,
              // meskipun jarang terjadi dengan NextResponse yang valid.
              console.error("Middleware: Gagal mengatur cookie pada response:", error);
            }
          },
        },
      },
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const { pathname } = request.nextUrl;
    // console.log(`Middleware (${pathname}): About to call supabase.auth.getUser()`);
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    // console.log(`Middleware (${pathname}): supabase.auth.getUser() result - user: ${user ? user.id : 'null'}, error: ${getUserError?.message || 'null'}`);

    // Rute yang terkait dengan autentikasi (pengguna yang sudah login akan dialihkan dari sini)
    const authRoutes = ["/sign-in", "/sign-up"];

    // Daftar base path yang memerlukan otentikasi untuk diakses
    const protectedRoutes = [
      // "/protected",
      "/unit-pengolah",
      "/unit-kearsipan",
      "/arsip",
      "/notifikasi",
      "/user",
      "/admin",       
      "/kepala-dinas",
      "/settings",
    ];

    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    if (getUserError && getUserError.message === 'fetch failed') {
      console.error(`Middleware (${pathname}): supabase.auth.getUser() gagal dengan "fetch failed". Ini mungkin masalah jaringan atau konfigurasi Supabase. Akses ke rute non-terproteksi akan diizinkan.`);
      // Jika fetch failed, kita tidak bisa memverifikasi sesi.
      // Biarkan pengguna mengakses rute non-terproteksi (termasuk /sign-in).
      // Rute terproteksi akan diblokir oleh pemeriksaan `!user` di bawah.
    }

    if (isAuthRoute) {
      // Jika pengguna sudah login dan mencoba mengakses halaman sign-in/sign-up
      if (user && !getUserError) { // Hanya redirect jika getUser berhasil dan user ada
        console.log(`Middleware (${pathname}): Pengguna sudah login dan berada di rute auth, mengalihkan ke /`);
        return NextResponse.redirect(new URL("/", request.url)); // Alihkan ke halaman utama setelah login
      }
      // Jika belum login atau ada error (termasuk fetch failed), izinkan akses ke halaman auth
      return response;
    }

    if (isProtectedRoute) {
      // Jika pengguna belum login dan mencoba mengakses rute terproteksi
      if (!user) { // Kondisi !user sudah mencakup kasus getUserError
        console.log(`Middleware (${pathname}): Tidak ada sesi pengguna atau error, mengalihkan ke /sign-in.`);
        const redirectUrl = new URL("/sign-in", request.url);
        redirectUrl.searchParams.set('redirectedFrom', pathname); // Simpan path asal untuk redirect setelah login
        return NextResponse.redirect(redirectUrl);
      }
    }

    return response;
  } catch (e) {
    const error = e as Error; // Type assertion untuk akses properti error
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    // Check out http://localhost:3000 for Next Steps.
    console.error(`CRITICAL ERROR in Supabase middleware for path: ${request.nextUrl.pathname}:`, error.message, error.stack);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
