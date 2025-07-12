import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () =>
  createBrowserClient(supabaseUrl!, supabaseKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Tambahan konfigurasi untuk session recovery
      flowType: "pkce",
      debug: process.env.NODE_ENV === "development",
    },
    global: {
      headers: {
        "X-Client-Info": "nextjs-auth-enhanced",
      },
    },
    // Tambahan konfigurasi untuk connection stability
    realtime: {
      params: {
        eventsPerSecond: 2,
      },
    },
  });

// Tambahan: Helper function untuk manual session refresh
export const refreshSessionManually = async (client: SupabaseClient): Promise<{ success: boolean; error?: unknown; data?: unknown }> => {
  try {
    const { data, error } = await client.auth.refreshSession();

    if (error) {
      console.error("Manual session refresh failed:", error);
      return { success: false, error };
    }

    console.log("Manual session refresh successful");
    return { success: true, data };
  } catch (error) {
    console.error("Manual session refresh exception:", error);
    return { success: false, error };
  }
};

// Helper function untuk check session validity
export const isSessionValid = async (client: SupabaseClient): Promise<boolean> => {
  try {
    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (error || !session) {
      return false;
    }

    // Check if token is close to expiry (within 5 minutes)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    if (!expiresAt) {
      return false;
    }
    const timeUntilExpiry = expiresAt - now;

    // Return false if token expires within 5 minutes
    return timeUntilExpiry > 300; // 300 seconds = 5 minutes
  } catch (error) {
    console.error("Session validity check failed:", error);
    return false;
  }
};
