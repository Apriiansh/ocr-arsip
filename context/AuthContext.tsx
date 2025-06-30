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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  // Simplified refs - hanya yang benar-benar diperlukan
  const mountedRef = useRef(true);
  const isProcessingRef = useRef(false);

  const SIGN_IN_PATH = "/sign-in";
  const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/user-manual"];
  const MAX_RETRY = 3;
  const LOADING_TIMEOUT = 10000; // 10 detik

  // Simplified loading timeout
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
  }, [loadingTimeout]);

  // Simplified setLoading dengan auto timeout
  const setLoadingState = useCallback((loading: boolean) => {
    if (!mountedRef.current) return;

    clearLoadingTimeout();
    setIsLoading(loading);

    if (loading) {
      const timeout = setTimeout(() => {
        if (mountedRef.current) {
          console.warn("Loading timeout - forcing stop");
          setIsLoading(false);
          setError("Koneksi timeout. Silakan coba lagi.");
        }
      }, LOADING_TIMEOUT);
      setLoadingTimeout(timeout);
    }
  }, [clearLoadingTimeout]);

  // Simplified fetchUserDetails
  const fetchUserDetails = useCallback(async (authUser: SupabaseUser): Promise<UserProfile | null> => {
    try {
      const { data: userData, error: userDbError } = await supabase
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

      if (userDbError) {
        if (userDbError.code === 'PGRST116') {
          // User tidak ditemukan di database
          await supabase.auth.signOut();
          return null;
        }
        throw userDbError;
      }

      if (!userData) return null;

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
      console.error("Error fetching user details:", e.message);
      throw e;
    }
  }, [supabase]);

  // Simplified auth handler - no more complex state tracking
  const handleAuthChange = useCallback(async (event: string, session: any) => {
    // Prevent multiple simultaneous processing
    if (isProcessingRef.current || !mountedRef.current) {
      console.log("Skipping auth change - already processing or unmounted");
      return;
    }

    isProcessingRef.current = true;
    console.log(`Auth change: ${event}`);

    try {
      const authUser = session?.user ?? null;

      if (authUser) {
        // User authenticated
        const userDetails = await fetchUserDetails(authUser);

        if (mountedRef.current) {
          if (userDetails) {
            setUser(userDetails);
            setError(null);
            setRetryCount(0);
          } else {
            setUser(null);
            if (!PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
              router.push(SIGN_IN_PATH);
            }
          }
        }
      } else {
        // No user
        if (mountedRef.current) {
          setUser(null);
          if (!PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
            router.push(SIGN_IN_PATH);
          }
        }
      }
    } catch (error: any) {
      console.error("Auth change error:", error);
      if (mountedRef.current) {
        setError("Terjadi kesalahan autentikasi");
        setUser(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoadingState(false);
        isProcessingRef.current = false;
      }
    }
  }, [fetchUserDetails, pathname, router, setLoadingState]);

  // Simplified initialization
  const initializeAuth = useCallback(async () => {
    if (!mountedRef.current || isProcessingRef.current) return;

    // Check if on public page - skip auth if so
    const isPublicPage = PUBLIC_PATHS.some(p => pathname.startsWith(p));
    if (isPublicPage) {
      setLoadingState(false);
      return;
    }

    console.log("Initializing auth...");
    setLoadingState(true);
    setError(null);

    try {
      const { data: { user: initialUser }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        if (authError.message?.toLowerCase().includes('auth session missing')) {
          // No session - normal untuk user yang belum login
          setUser(null);
          router.push(SIGN_IN_PATH);
        } else {
          setError(`Error autentikasi: ${authError.message}`);
        }
        return;
      }

      // Process initial user
      await handleAuthChange('INITIAL_SESSION', { user: initialUser });

    } catch (error: any) {
      console.error("Init auth error:", error);
      if (retryCount < MAX_RETRY) {
        setTimeout(() => {
          if (mountedRef.current) {
            setRetryCount(prev => prev + 1);
            initializeAuth();
          }
        }, 1000);
      } else {
        setError("Gagal menginisialisasi autentikasi");
      }
    } finally {
      if (mountedRef.current && !isProcessingRef.current) {
        setLoadingState(false);
      }
    }
  }, [supabase, handleAuthChange, setLoadingState, pathname, router, retryCount]);

  // Setup effect - simplified
  useEffect(() => {
    mountedRef.current = true;

    // Setup auth listener
    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Initialize
    initializeAuth();

    return () => {
      mountedRef.current = false;
      isProcessingRef.current = false;
      clearLoadingTimeout();
      authListener.subscription.unsubscribe();
    };
  }, []);

  // REMOVED: Complex visibility change handler - ini yang sering jadi masalah
  // Supabase auth listener sudah handle session changes secara otomatis

  const signOut = useCallback(async () => {
    if (!mountedRef.current) return;

    setLoadingState(true);
    setError(null);

    try {
      await supabase.auth.signOut();
      if (mountedRef.current) {
        setUser(null);
        router.push(SIGN_IN_PATH);
      }
    } catch (error: any) {
      console.error("Sign out error:", error);
      if (mountedRef.current) {
        setError(`Gagal sign out: ${error.message}`);
      }
    } finally {
      if (mountedRef.current) {
        setLoadingState(false);
      }
    }
  }, [supabase, router, setLoadingState]);

  const retry = useCallback(async () => {
    if (retryCount >= MAX_RETRY) return;

    setRetryCount(prev => prev + 1);
    setError(null);
    await initializeAuth();
  }, [retryCount, initializeAuth]);

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