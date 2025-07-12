"use client";

import { createClient } from "@/utils/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";

// Tipe manual untuk data daftar_bidang yang diambil
interface DaftarBidangType {
  id_bidang: number;
  nama_bidang: string;
  kode_filing_cabinet: string | null;
}

export interface UserProfile extends SupabaseUser {
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
  retry: () => Promise<void>;
}

const GLOBAL_LOADING_TIMEOUT = 8 * 1000; // 8 detik (lebih cepat)
const MAX_RETRY_ATTEMPTS = 3;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  // Refs untuk tracking state dan cleanup
  const mountedRef = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authListenerRef = useRef<any>(null);

  const SIGN_IN_PATH = "/sign-in";
  const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/user-manual"];

  // Helper untuk cleanup timeout
  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // Helper untuk set loading dengan timeout protection
  const setLoadingWithTimeout = useCallback((loading: boolean) => {
    if (!mountedRef.current) return;

    setIsLoading(loading);
    clearLoadingTimeout();

    if (loading) {
      loadingTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;

        console.warn(`AuthContext: Loading timeout after ${GLOBAL_LOADING_TIMEOUT / 1000}s. Attempting retry...`);

        if (retryCount < MAX_RETRY_ATTEMPTS) {
          setRetryCount(prev => prev + 1);
          // Retry initialization
          initializeAuth();
        } else {
          console.error('AuthContext: Max retry attempts reached. Forcing page refresh.');
          window.location.reload();
        }
      }, GLOBAL_LOADING_TIMEOUT);
    }
  }, [retryCount, clearLoadingTimeout]);

  const fetchUserDetails = useCallback(async (authUser: SupabaseUser | null): Promise<UserProfile | null> => {
    if (!authUser || !mountedRef.current) return null;

    try {
      // Tambahkan timeout untuk query database
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      );

      const queryPromise = supabase
        .from("users")
        .select(`
          nama, 
          nip, 
          jabatan, 
          pangkat, 
          role, 
          id_bidang_fkey, 
          daftar_bidang:id_bidang_fkey ( 
            id_bidang, 
            nama_bidang, 
            kode_filing_cabinet 
          )
        `)
        .eq("user_id", authUser.id)
        .single();

      const { data: userData, error: userDbError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;

      if (!mountedRef.current) return null;

      if (userDbError) {
        console.error("AuthContext: Error fetching user details:", userDbError.message);

        // Jika error karena user tidak ditemukan, logout
        if (userDbError.code === 'PGRST116') {
          console.warn("AuthContext: User not found in database. Signing out...");
          await supabase.auth.signOut();
          return null;
        }

        setError(`Gagal mengambil detail pengguna: ${userDbError.message}`);
        throw userDbError;
      }

      if (!userData) {
        setError("Data pengguna tidak ditemukan.");
        return null;
      }

      // Handle daftar_bidang data
      const daftarBidangData = Array.isArray(userData.daftar_bidang)
        ? userData.daftar_bidang[0]
        : userData.daftar_bidang;

      return {
        ...authUser,
        ...userData,
        daftar_bidang: daftarBidangData
      };

    } catch (e: any) {
      if (!mountedRef.current) return null;

      console.error("AuthContext: Error in fetchUserDetails:", e.message);
      setError(`Terjadi kesalahan: ${e.message}`);
      return null;
    }
  }, [supabase]);

  const handleAuthStateChange = useCallback(async (event: string, session: any) => {
    if (!mountedRef.current) return;

    try {
      // Reset error saat ada perubahan auth state, kecuali pada halaman publik
      const isPublicPage = PUBLIC_PATHS.some(p => pathname.startsWith(p));
      if (!isPublicPage) {
        setError(null);
      }

      const authUser = session?.user ?? null;

      if (authUser) {
        const userDetails = await fetchUserDetails(authUser);

        if (!mountedRef.current) return;

        if (userDetails) {
          setUser(userDetails);
          setRetryCount(0); // Reset retry count on success
        } else {
          setUser(null);
          // Redirect ke sign-in jika bukan halaman publik
          if (!PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
            router.push(SIGN_IN_PATH);
          }
        }
      } else {
        setUser(null);
        // Redirect jika tidak ada sesi dan bukan halaman publik
        if (!PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
          router.push(SIGN_IN_PATH);
        }
      }
    } catch (error) {
      console.error("AuthContext: Error in handleAuthStateChange:", error);
      if (mountedRef.current) {
        setError("Terjadi kesalahan saat memproses autentikasi.");
      }
    } finally {
      if (mountedRef.current) {
        setLoadingWithTimeout(false);
      }
    }
  }, [fetchUserDetails, pathname, router, setLoadingWithTimeout]);

  const initializeAuth = useCallback(async () => {
    if (!mountedRef.current) return;

    // Jika di halaman publik, skip auth check dan set loading false
    const isPublicPage = PUBLIC_PATHS.some(p => pathname.startsWith(p));
    if (isPublicPage) {
      console.log("AuthContext: On public page, skipping auth initialization");
      setLoadingWithTimeout(false);
      setUser(null);
      return;
    }

    setLoadingWithTimeout(true);
    setError(null);

    try {
      // Get initial session dan user dengan timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth initialization timeout')), 5000)
      );

      // Logging session dan user
      const sessionResult = await supabase.auth.getSession();
      console.log('AuthContext: getSession() result on mount:', sessionResult);
      if (sessionResult?.data?.session) {
        console.log('AuthContext: Session detail:', sessionResult.data.session);
      } else {
        console.warn('AuthContext: No session found in getSession() result');
      }

      console.log('AuthContext: Calling getUser()...');
      const authPromise = supabase.auth.getUser();
      const { data: { user: initialUser }, error: authError } = await Promise.race([
        authPromise,
        timeoutPromise
      ]) as any;
      console.log('AuthContext: getUser() result on mount:', { initialUser, authError });

      if (!mountedRef.current) return;

      if (authError) {
        // Abaikan error "Auth session missing" pada halaman publik
        const isPublicPage = PUBLIC_PATHS.some(p => pathname.startsWith(p));
        const isSessionMissingError = authError.message?.toLowerCase().includes('auth session missing');

        if (isSessionMissingError && isPublicPage) {
          console.log("AuthContext: No auth session on public page - this is expected");
          setLoadingWithTimeout(false);
          return;
        }

        console.error("AuthContext: Auth error:", authError.message);
        setError(`Error autentikasi: ${authError.message}`);
        setLoadingWithTimeout(false);
        return;
      }

      await handleAuthStateChange('INITIAL_SESSION', { user: initialUser });

    } catch (error: any) {
      if (!mountedRef.current) return;

      console.error("AuthContext: Error in initializeAuth:", error.message);
      setError(`Gagal menginisialisasi autentikasi: ${error.message}`);
      setLoadingWithTimeout(false);
    }
  }, [supabase, handleAuthStateChange, setLoadingWithTimeout]);

  const retry = useCallback(async () => {
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      console.warn("AuthContext: Max retry attempts reached");
      return;
    }

    setRetryCount(prev => prev + 1);
    await initializeAuth();
  }, [retryCount, initializeAuth]);

  // Setup auth listener dan initialization
  useEffect(() => {
    mountedRef.current = true;

    // Setup auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);
    authListenerRef.current = authListener;

    // Initialize auth
    initializeAuth();

    return () => {
      mountedRef.current = false;
      clearLoadingTimeout();

      if (authListenerRef.current?.subscription) {
        authListenerRef.current.subscription.unsubscribe();
      }
    };
  }, [supabase, handleAuthStateChange, initializeAuth, clearLoadingTimeout]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearLoadingTimeout();
    };
  }, [clearLoadingTimeout]);

  const signOut = async () => {
    if (!mountedRef.current) return;

    setLoadingWithTimeout(true);
    setError(null);

    try {
      await supabase.auth.signOut();
      if (mountedRef.current) {
        setUser(null);
        router.refresh();
      }
    } catch (error: any) {
      console.error("AuthContext: Error during sign out:", error);
      if (mountedRef.current) {
        setError(`Gagal sign out: ${error.message}`);
      }
    } finally {
      if (mountedRef.current) {
        setLoadingWithTimeout(false);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, signOut, retry }}>
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