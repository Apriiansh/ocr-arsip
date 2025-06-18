// d:\Project\after\ocr-arsip\contexts\AuthContext.tsx
"use client";

import { createClient } from "@/utils/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

// Tipe manual untuk data daftar_bidang yang diambil
interface DaftarBidangType {
  id_bidang: number;
  nama_bidang: string;
  kode_filing_cabinet: string | null;
}

interface UserProfile extends SupabaseUser {
  role?: string;
  nama?: string;
  nip?: string | null;
  jabatan?: string | null;
  pangkat?: string | null;
  id_bidang_fkey?: number | null;
  daftar_bidang?: DaftarBidangType | null;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const GLOBAL_LOADING_TIMEOUT = 10 * 1000; // 10 detik

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const SIGN_IN_PATH = "/sign-in";
  const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/user-manual"]; // Path yang tidak memerlukan auth

  const fetchUserDetails = useCallback(async (authUser: SupabaseUser | null): Promise<UserProfile | null> => {
    if (!authUser) return null;

    try {
      const { data: userData, error: userDbError } = await supabase
        .from("users")
        .select("nama, nip, jabatan, pangkat, role, id_bidang_fkey, daftar_bidang:id_bidang_fkey ( id_bidang, nama_bidang, kode_filing_cabinet )") // Ambil data terkait dari daftar_bidang
        .eq("user_id", authUser.id)
        .single();

      if (userDbError) {
        console.error("AuthContext: Error fetching user details:", userDbError.message);
        // Pertimbangkan untuk logout pengguna jika detail penting tidak ditemukan
        // await supabase.auth.signOut();
        // router.push(SIGN_IN_PATH);
        // setUser(null); // Pastikan user di-reset jika detail gagal
        // Atau setidaknya tandai sebagai error
        setError("Gagal mengambil detail pengguna.");
        // Kembalikan null atau user dasar, tergantung bagaimana Anda ingin menangani error ini.
        // Jika user tidak valid tanpa detail, kembalikan null.
        return null; 
      }

      // Supabase might return the related data as an array even with .single() on the main table.
      // Ensure daftar_bidang is treated as a single object or null.
      const daftarBidangData = Array.isArray(userData.daftar_bidang) ? userData.daftar_bidang[0] : userData.daftar_bidang;
      return { ...authUser, ...userData, daftar_bidang: daftarBidangData };
    } catch (e: any) {
      console.error("AuthContext: Unexpected error fetching user details:", e.message);
      setError("Terjadi kesalahan saat mengambil detail pengguna.");
      // Sama seperti di atas, kembalikan null jika error ini membuat user tidak valid.
      return null; 
    }
  }, [supabase]);

  useEffect(() => {
    setIsLoading(true);
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const authUser = session?.user ?? null;
        if (authUser) {
          const userDetails = await fetchUserDetails(authUser);
          setUser(userDetails);
          // Jika userDetails null (karena error di fetchUserDetails), dan bukan halaman publik, redirect
          if (!userDetails && !PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
            router.push(SIGN_IN_PATH);
          }
        } else {
          setUser(null);
          // Redirect jika tidak ada sesi dan bukan halaman publik
          if (!PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
            router.push(SIGN_IN_PATH);
          }
        }
        setIsLoading(false);
      }
    );

    // Initial check
    supabase.auth.getUser().then(async ({ data: { user: initialUser } }) => {
      if (initialUser) {
        const userDetails = await fetchUserDetails(initialUser);
        setUser(userDetails);
        if (!userDetails && !PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
          router.push(SIGN_IN_PATH);
        }
      } else {
        // Jika tidak ada initialUser dan bukan halaman publik, redirect
        if (!PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
          router.push(SIGN_IN_PATH);
        }
      }
      setIsLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router, pathname, fetchUserDetails]);

  // Timeout untuk isLoading global
  useEffect(() => {
    let loadingTimer: NodeJS.Timeout | null = null;

    if (isLoading) {
      loadingTimer = setTimeout(() => {
        console.warn(`AuthContext: isLoading has been true for over ${GLOBAL_LOADING_TIMEOUT / 1000} seconds. Forcing page refresh.`);
        window.location.reload();
      }, GLOBAL_LOADING_TIMEOUT);
    } else {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
      }
    }

    return () => {
      if (loadingTimer) clearTimeout(loadingTimer);
    };
  }, [isLoading]);

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
