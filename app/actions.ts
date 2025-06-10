"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";

async function isCurrentUserAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;
  
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("user_id", user.id)
    .single();
    
  return userData?.role === 'Admin';
}

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const nama = formData.get("nama")?.toString();
  const nip = formData.get("nip")?.toString();
  const pangkat = formData.get("pangkat")?.toString();
  const idBidang = formData.get("idBidang")?.toString();
  const jabatan = formData.get("jabatan")?.toString();

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password || !nama || !nip || !pangkat || !idBidang || !jabatan) {
    return {
      type: "error",
      message: "Semua field wajib diisi"
    };
  }

  let role = "Pegawai";
  if (jabatan === "Kepala Bidang") {
    role = "Kepala_Bidang";
  } else if (jabatan === "Kepala Dinas") {
    role = "Kepala_Dinas";
  } else if (jabatan === "Sekretaris") {
    role = "Sekretaris";
  }

  if (
    jabatan === "Kepala Bidang" ||
    jabatan === "Kepala Dinas" ||
    jabatan === "Sekretaris"
  ) {
    const { data: existing, error: checkError } = await supabase
      .from("users")
      .select("user_id")
      .eq("jabatan", jabatan)
      .eq("id_bidang_fkey", Number(idBidang))
      .maybeSingle();

    if (checkError) {
      return {
        type: "error",
        message: "Gagal memeriksa jabatan di database"
      };
    }
    if (existing) {
      return {
        type: "error",
        message: `Jabatan ${jabatan} sudah terdaftar di bidang ini`
      };
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return {
      type: "error",
      message: error.message
    };
  }

  const userId = data.user?.id;
  if (!userId) {
    return {
      type: "error",
      message: "Gagal mendapatkan User ID"
    };
  }

  const { error: userError } = await supabase.from("users").insert([
    {
      user_id: userId,
      nama,
      nip,
      pangkat,
      email,
      id_bidang_fkey: Number(idBidang),
      jabatan,
      role,
    },
  ]);

  if (userError) {
    console.error(
      "SIGNUP_ACTION_USER_INSERT_ERROR for email:", email,
      "jabatan:", jabatan, "role:", role, "idBidang:", idBidang,
      "Error:", JSON.stringify(userError, null, 2)
    );
    return {
      type: "error",
      message: userError.message
    };
  }

  return {
    type: "success",
    message: "Pendaftaran Berhasil"
  };
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      error: error.message
    };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: userData, error: userDbError } = await supabase
        .from("users")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (userDbError) {
        console.error(`signInAction: Error fetching role for user ${user.id}:`, JSON.stringify(userDbError, null, 2));
        return {
          success: false,
          error: "Gagal mengambil data pengguna"
        };
      } else if (userData?.role) {
        const ROLE_PATHS: Record<string, string> = {
          "Admin": "/admin",
          "Kepala_Bidang": "/unit-pengolah",
          "Sekretaris": "/unit-kearsipan", 
          "Pegawai": "/user",
          "Kepala_Dinas": "/kepala-dinas",
        };
        const redirectPath = ROLE_PATHS[userData.role] || "/user";
        console.log(`signInAction: User ${user.id} has role ${userData.role}. Redirecting to ${redirectPath}.`);
        
        return {
          success: true,
          redirectTo: redirectPath
        };
      } else {
        console.warn(`signInAction: User ${user.id} found, but role not found in users table or userData is null. userData:`, userData);
        return {
          success: false,
          error: "Role pengguna tidak ditemukan"
        };
      }
    } else {
      console.warn(`signInAction: supabase.auth.getUser() returned no user immediately after successful signInWithPassword.`);
      return {
        success: false,
        error: "Gagal mendapatkan data pengguna"
      };
    }
  } catch (roleError) {
    console.error("Error getting user role:", roleError);
    return {
      success: false,
      error: "Terjadi kesalahan saat login"
    };
  }
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  return encodedRedirect("success", "/sign-in", "Password updated successfully. Please sign in.");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return {
      success: false,
      error: error.message
    };
  }
  
  return {
    success: true
  };
};

export async function getCurrentUserProfile() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("getCurrentUserProfile: Error fetching auth user or no user.", authError);
    return { success: false, message: "Sesi tidak ditemukan atau tidak valid.", data: null };
  }

  try {
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select(`
        user_id,
        nama,
        email,
        nip,
        pangkat,
        jabatan,
        role,
        id_bidang_fkey,
        daftar_bidang (nama_bidang)
      `)
      .eq("user_id", user.id)
      .single();

    if (profileError) throw profileError;
    return { success: true, data: userProfile };
  } catch (error: unknown) {
    console.error("Error fetching current user profile:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message || "Gagal mengambil data profil pengguna.", data: null };
    }
    return { success: false, message: "Gagal mengambil data profil pengguna.", data: null };
  }
}

export async function updateCurrentUserProfileAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, message: "Sesi tidak ditemukan atau tidak valid." };
  }

  const nama = formData.get("nama") as string;
  const nip = formData.get("nip") as string || null;
  const pangkat = formData.get("pangkat") as string || null;

  if (!nama) {
    return { success: false, message: "Nama wajib diisi." };
  }

  try {
    const { error: updateError } = await supabase
      .from("users")
      .update({ nama, nip, pangkat })
      .eq("user_id", user.id);

    if (updateError) throw updateError;
    return { success: true, message: "Profil berhasil diperbarui." };
  } catch (error: unknown) {
    console.error("Error updating current user profile:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message || "Gagal memperbarui profil." };
    }
    return { success: false, message: "Gagal memperbarui profil." };
  }
}

export async function getUsersWithBidangAction(filterRole?: string) {
  if (!(await isCurrentUserAdmin())) {
    return { success: false, message: "Access denied. Admin role required." };
  }

  const supabase = createAdminClient();
  try {
    let query = supabase
      .from("users")
      .select(`
        *,
        daftar_bidang (nama_bidang)
      `)
      .order("created_at", { ascending: false });

    if (filterRole && filterRole !== "Semua") {
      query = query.eq("role", filterRole);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data };
  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message || "Gagal mengambil data pengguna." };
    }
    return { success: false, message: "Gagal mengambil data pengguna." };
  }
}

export async function adminCreateUserAction(formData: FormData) {
  if (!(await isCurrentUserAdmin())) {
    return { success: false, message: "Access denied. Admin role required." };
  }

  const supabase = createAdminClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const nama = formData.get("nama") as string;
  const nip = formData.get("nip") as string || null;
  const pangkat = formData.get("pangkat") as string || null;
  const jabatan = formData.get("jabatan") as string;
  const role = formData.get("role") as string;
  const id_bidang_fkey_str = formData.get("id_bidang_fkey") as string;

  if (!email || !password || !nama || !jabatan || !role || !id_bidang_fkey_str) {
    return { success: false, message: "Semua field yang wajib (Email, Password, Nama, Jabatan, Role, Bidang) harus diisi." };
  }

  const id_bidang_fkey = parseInt(id_bidang_fkey_str, 10);
  if (isNaN(id_bidang_fkey)) {
      return { success: false, message: "ID Bidang tidak valid." };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Gagal membuat pengguna di sistem autentikasi.");

    const userId = authData.user.id;

    // 2. Insert user details into public.users
    const { error: publicUserError } = await supabase.from("users").insert({
      user_id: userId,
      email,
      nama,
      nip,
      pangkat,
      jabatan,
      role,
      id_bidang_fkey,
    });

    if (publicUserError) {
      await supabase.auth.admin.deleteUser(userId);
      throw publicUserError;
    }

    return { success: true, message: "Pengguna berhasil dibuat." };
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message || "Gagal membuat pengguna." };
    }
    return { success: false, message: "Gagal membuat pengguna." };
  }
}

export async function adminUpdateUserAction(userId: string, formData: FormData) {
  if (!(await isCurrentUserAdmin())) {
    return { success: false, message: "Access denied. Admin role required." };
  }

  const supabase = createAdminClient();
  console.log(`[adminUpdateUserAction] Attempting to update user ID: ${userId}`);
  
  // Log semua data dari FormData
  const formEntries: Record<string, FormDataEntryValue> = {};
  formData.forEach((value, key) => {
    formEntries[key] = value;
  });
  console.log("[adminUpdateUserAction] FormData received:", JSON.stringify(formEntries, null, 2));

  const email = formData.get("email") as string;
  const newPassword = formData.get("password") as string | undefined; // Optional
  const nama = formData.get("nama") as string;
  const nip = formData.get("nip") as string || null;
  const pangkat = formData.get("pangkat") as string || null;
  const jabatan = formData.get("jabatan") as string;
  const role = formData.get("role") as string;
  const id_bidang_fkey_str = formData.get("id_bidang_fkey") as string;

  console.log(`[adminUpdateUserAction] Parsed form data - Email: ${email}, Nama: ${nama}, Jabatan: ${jabatan}, Role: ${role}, ID Bidang Str: ${id_bidang_fkey_str}, NewPassword provided: ${!!newPassword}`);

  if (!email || !nama || !jabatan || !role || !id_bidang_fkey_str) {
    console.error("[adminUpdateUserAction] Validation failed: Missing required fields.");
    return { success: false, message: "Field Email, Nama, Jabatan, Role, dan Bidang wajib diisi." };
  }

  const id_bidang_fkey = parseInt(id_bidang_fkey_str, 10);
   if (isNaN(id_bidang_fkey)) {
      console.error(`[adminUpdateUserAction] Validation failed: Invalid id_bidang_fkey_str: ${id_bidang_fkey_str}`);
      return { success: false, message: "ID Bidang tidak valid." };
  }
  console.log(`[adminUpdateUserAction] Parsed id_bidang_fkey: ${id_bidang_fkey}`);

  try {
    console.log("[adminUpdateUserAction] Attempting to update public.users table...");
    const { error: publicUserError } = await supabase
      .from("users")
      .update({
        email,
        nama,
        nip,
        pangkat,
        jabatan,
        role,
        id_bidang_fkey,
      })
      .eq("user_id", userId);

    if (publicUserError) {
      console.error("[adminUpdateUserAction] Error updating public.users table:", JSON.stringify(publicUserError, null, 2));
      throw publicUserError;
    }
    console.log("[adminUpdateUserAction] Successfully updated public.users table.");

    const authUpdatePayload: { email?: string; password?: string } = {};
    if (email) authUpdatePayload.email = email;
    if (newPassword) authUpdatePayload.password = newPassword;

    if (Object.keys(authUpdatePayload).length > 0) {
      console.log("[adminUpdateUserAction] Attempting to update auth.users with payload:", JSON.stringify(authUpdatePayload, null, 2));
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, authUpdatePayload);
      if (authError) {
        console.error("[adminUpdateUserAction] Error updating auth.users:", JSON.stringify(authError, null, 2));
        throw authError;
      }
      console.log("[adminUpdateUserAction] Successfully updated auth.users.");
    } else {
      console.log("[adminUpdateUserAction] No changes to email or password for auth.users.");
    }

    console.log(`[adminUpdateUserAction] User ID: ${userId} updated successfully.`);
    return { success: true, message: "Pengguna berhasil diperbarui." };
  } catch (error: unknown) {
    console.error(`[adminUpdateUserAction] Catch block error for user ID ${userId}:`, JSON.stringify(error, null, 2));
    if (error instanceof Error) {
      return { success: false, message: error.message || "Gagal memperbarui pengguna." };
    }
    return { success: false, message: "Gagal memperbarui pengguna." };
  }
}

export async function adminDeleteUserAction(userId: string) {
  if (!(await isCurrentUserAdmin())) {
    return { success: false, message: "Access denied. Admin role required." };
  }

  const supabase = createAdminClient();
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
    return { success: true, message: "Pengguna berhasil dihapus." };
  } catch (error: unknown) {
    console.error("Error deleting user:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message || "Gagal menghapus pengguna." };
    }
    return { success: false, message: "Gagal menghapus pengguna." };
  }
}
