"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

// Definisikan konstanta untuk path agar mudah dikelola
const ROLE_PATHS: Record<string, string> = {
  "Admin": "/admin",
  "Kepala_Bidang": "/unit-pengolah",
  "Sekretaris": "/unit-kearsipan",
  "Pegawai": "/user",
  "Kepala_Dinas": "/kepala-dinas",
};
const DEFAULT_USER_PATH = "/user/";
const SIGN_IN_PATH = "/sign-in";
const SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY = 'loginNotificationShown';

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  const checkSessionAndRedirect = useCallback(async () => {
    console.log("HomeRedirect: checkSessionAndRedirect started");

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log("HomeRedirect: 1. Attempting to get user session...");

      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("HomeRedirect: 1.1. getSession result", { hasSession: !!session, sessionError });

      // Jika session null, coba refresh session dulu
      if (!session) {
        console.log("HomeRedirect: No session found, trying to refresh session...");
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        session = refreshed?.session;
        if (refreshError) {
          console.error("HomeRedirect: Refresh session error:", refreshError.message);
        }
        if (!session) {
          console.log("HomeRedirect: Session still null after refresh, redirecting to sign-in.");
          sessionStorage.removeItem(SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY);
          router.push(SIGN_IN_PATH);
          setLoading(false);
          return;
        }
      }

      // Sekarang ambil user data
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log("HomeRedirect: 1.2. getUser result", { hasUser: !!user, userError });

      if (userError || !user) {
        console.error("HomeRedirect: User error:", userError?.message);
        sessionStorage.removeItem(SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY);
        router.push(SIGN_IN_PATH);
        setLoading(false);
        return;
      }

      const userId = user.id;
      console.log(`HomeRedirect: 2. Getting user role for ID: ${userId}`);

      const { data: userData, error: userDbError } = await supabase
        .from("users")
        .select("role")
        .eq("user_id", userId)
        .single();

      console.log("HomeRedirect: 2.1. User role result", { userData, userDbError });

      if (userDbError || !userData) {
        console.error("HomeRedirect: Error fetching user role:", userDbError?.message);
        sessionStorage.removeItem(SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY);
        router.push(SIGN_IN_PATH);
        setLoading(false);
        return;
      }

      const userRole = userData.role || "Pegawai";
      console.log(`HomeRedirect: 2.2. User role: ${userRole}`);

      // Handle notifications (jika diperlukan)
      const loginNotificationShown = sessionStorage.getItem(SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY);
      if (!loginNotificationShown) {
        try {
          const { data: unreadNotifications } = await supabase
            .from("notifications")
            .select("id_notif, message, link, created_at")
            .eq("user_id", userId)
            .eq("is_read", false)
            .order("created_at", { ascending: false });

          if (unreadNotifications && unreadNotifications.length > 0) {
            console.log(`HomeRedirect: Found ${unreadNotifications.length} unread notifications`);
            // Handle notifications display here if needed
          }

          sessionStorage.setItem(SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY, 'true');
        } catch (notifError) {
          console.error("HomeRedirect: Error with notifications:", notifError);
        }
      }

      // Redirect berdasarkan role
      const redirectPath = ROLE_PATHS[userRole] || DEFAULT_USER_PATH;
      console.log(`HomeRedirect: Target path: ${redirectPath}, current: ${pathname}`);

      if (pathname !== redirectPath) {
        console.log(`HomeRedirect: Redirecting to: ${redirectPath}`);
        router.push(redirectPath);
      }

    } catch (criticalError) {
      // Removed ": any" and don't use "any" type
      console.error("HomeRedirect: CRITICAL ERROR:", criticalError);
      sessionStorage.removeItem(SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY);
      router.push(SIGN_IN_PATH);
    } finally {
      setLoading(false);
    }
  }, [router, supabase, pathname]);

  useEffect(() => {
    console.log("HomeRedirect: useEffect triggered");
    checkSessionAndRedirect();
  }, [checkSessionAndRedirect]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-foreground animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return null;
}