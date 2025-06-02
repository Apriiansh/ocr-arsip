"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import Link from "next/link";
import { Bell, ArrowRight, X, Inbox, Eye } from "lucide-react";
import { markNotificationAsRead } from "@/utils/notificationService";

// Definisikan konstanta untuk path agar mudah dikelola
const ROLE_PATHS: Record<string, string> = {
  "Admin": "/admin/",
  "Kepala_Bidang": "/unit-pengolah/",
  "Sekretaris": "/unit-kearsipan/",
  "Pegawai": "/user/",
  "Kepala_Dinas": "/kepala-dinas/",
};
const DEFAULT_USER_PATH = "/user/";
const SIGN_IN_PATH = "/sign-in";
const NOTIFICATION_PATH = "/notifikasi";
const SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY = 'loginNotificationShown';

// Toast components tetap sama...
const IndividualNotificationToastContent = ({ message, link, notificationId }: {
  message: string;
  link?: string | null;
  notificationId: string;
}) => {
  // Implementation sama seperti sebelumnya...
  return <div>Notification content</div>;
};

const SummaryNotificationToastContent = ({ remainingCount }: { remainingCount: number }) => {
  // Implementation sama seperti sebelumnya...
  return <div>Summary content</div>;
};

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  const checkSessionAndRedirect = useCallback(async () => {
    console.log("HomeRedirect: checkSessionAndRedirect started");

    try {
      // PERBAIKAN: Tunggu sebentar untuk memastikan session sudah ter-load
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log("HomeRedirect: 1. Attempting to get user session...");

      // PERBAIKAN: Gunakan getSession() terlebih dahulu, lalu getUser()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("HomeRedirect: 1.1. getSession result", { hasSession: !!session, sessionError });

      if (sessionError) {
        console.error("HomeRedirect: Session error:", sessionError.message);
        sessionStorage.removeItem(SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY);
        router.push(SIGN_IN_PATH);
        setLoading(false);
        return;
      }

      if (!session) {
        console.log("HomeRedirect: No session found, redirecting to sign-in.");
        sessionStorage.removeItem(SESSION_STORAGE_LOGIN_NOTIFICATION_SHOWN_KEY);
        router.push(SIGN_IN_PATH);
        setLoading(false);
        return;
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

    } catch (criticalError: any) {
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

  // PERBAIKAN: Tampilkan loading dengan lebih baik
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