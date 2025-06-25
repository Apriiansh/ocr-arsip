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
  const [isTabVisible, setIsTabVisible] = useState(true);

  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  // Refs untuk tracking state dan cleanup
  const mountedRef = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authListenerRef = useRef<any>(null);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Enhanced fetchUserDetails dengan retry mechanism
  const fetchUserDetails = useCallback(async (authUser: SupabaseUser | null): Promise<UserProfile | null> => {
    if (!authUser || !mountedRef.current) return null;

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        // Increase timeout for better reliability
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database query timeout')), 10000) // 10 seconds
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

          // Retry on network errors
          if (attempts < maxAttempts - 1 && (
            userDbError.message.includes('timeout') || 
            userDbError.message.includes('network') ||
            userDbError.message.includes('connection')
          )) {
            attempts++;
            console.log(`AuthContext: Retrying fetchUserDetails (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            continue;
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

        if (attempts < maxAttempts - 1) {
          attempts++;
          console.log(`AuthContext: Retrying fetchUserDetails after error (attempt ${attempts + 1}/${maxAttempts}):`, e.message);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        console.error("AuthContext: Error in fetchUserDetails:", e.message);
        setError(`Terjadi kesalahan: ${e.message}`);
        return null;
      }
    }

    return null;
  }, [supabase]);

  // Helper untuk handle tab visibility changes
  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden;
    setIsTabVisible(isVisible);
    
    if (isVisible) {
      console.log("AuthContext: Tab became visible, checking auth state...");
      
      // Clear any pending visibility timeout
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }
      
      // Re-check authentication after user returns to tab
      // Delay sedikit untuk memastikan browser sudah stabil
      setTimeout(() => {
        if (mountedRef.current && !PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
          initializeAuth();
        }
      }, 500);
    } else {
      console.log("AuthContext: Tab became hidden");
      
      // Set timeout untuk mencegah logout saat tab hidden terlalu lama
      visibilityTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current || isTabVisible) return;
        
        console.log("AuthContext: Tab hidden for too long, checking session...");
        // Only check session, don't force logout
        supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (error || !session) {
            console.log("AuthContext: No valid session found while tab was hidden");
            setUser(null);
            if (!PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
              router.push(SIGN_IN_PATH);
            }
          }
        });
      }, 30000); // 30 seconds timeout
    }
  }, [isTabVisible, pathname, router, supabase]);

  // Enhanced handleAuthStateChange dengan tab visibility check
  const handleAuthStateChange = useCallback(async (event: string, session: any) => {
    if (!mountedRef.current) return;
    
    // Skip auth state changes when tab is hidden untuk mencegah false logout
    if (!isTabVisible && event !== 'INITIAL_SESSION') {
      console.log("AuthContext: Ignoring auth state change while tab is hidden:", event);
      return;
    }

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
        // Only redirect if tab is visible to prevent false logouts
        if (isTabVisible) {
          setUser(null);
          // Redirect jika tidak ada sesi dan bukan halaman publik
          if (!PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
            router.push(SIGN_IN_PATH);
          }
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
  }, [fetchUserDetails, pathname, router, setLoadingWithTimeout, isTabVisible]);

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
      // Get initial user dengan timeout yang lebih panjang
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth initialization timeout')), 10000) // Increased to 10 seconds
      );

      const authPromise = supabase.auth.getUser();

      const { data: { user: initialUser }, error: authError } = await Promise.race([
        authPromise,
        timeoutPromise
      ]) as any;

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
  }, [supabase, handleAuthStateChange, setLoadingWithTimeout, pathname]);

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

  // Visibility handling effect
  useEffect(() => {
    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Add beforeunload listener untuk cleanup
    const handleBeforeUnload = () => {
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }
    };
  }, [handleVisibilityChange]);

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