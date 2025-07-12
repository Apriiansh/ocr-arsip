"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";

// ===== TYPES & CONSTANTS =====
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  type?: 'success' | 'error';
  redirectTo?: string;
}

const ROLE_PATHS: Record<string, string> = {
  "Admin": "/admin",
  "Kepala_Bidang": "/unit-pengolah",
  "Sekretaris": "/unit-kearsipan", 
  "Pegawai": "/user",
  "Kepala_Dinas": "/kepala-dinas",
};

const LEADERSHIP_ROLES = ["Kepala Bidang", "Kepala Dinas", "Sekretaris"];

// ===== UTILITY FUNCTIONS =====
function determineUserRole(jabatan: string): string {
  const roleMap: Record<string, string> = {
    "Kepala Bidang": "Kepala_Bidang",
    "Kepala Dinas": "Kepala_Dinas",
    "Sekretaris": "Sekretaris"
  };
  return roleMap[jabatan] || "Pegawai";
}

function validateRequiredFields(fields: Record<string, any>, requiredKeys: string[]): string | null {
  const missingFields = requiredKeys.filter(key => !fields[key]);
  return missingFields.length > 0 ? `Field berikut wajib diisi: ${missingFields.join(', ')}` : null;
}

function parseIntSafely(value: string | null, fieldName: string): { value: number | null; error: string | null } {
  if (!value) return { value: null, error: null };
  const parsed = parseInt(value, 10);
  return isNaN(parsed) 
    ? { value: null, error: `${fieldName} tidak valid` }
    : { value: parsed, error: null };
}

async function getAuthenticatedUser(supabase: any): Promise<{ user: any; error: string | null }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return { user: null, error: "Sesi tidak ditemukan atau tidak valid" };
    }
    return { user, error: null };
  } catch (err) {
    return { user: null, error: "Gagal mengambil data pengguna" };
  }
}

async function getUserRole(supabase: any, userId: string): Promise<{ role: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("user_id", userId)
      .single();
    
    if (error) return { role: null, error: "Gagal mengambil role pengguna" };
    return { role: data?.role || null, error: null };
  } catch (err) {
    return { role: null, error: "Gagal mengambil role pengguna" };
  }
}

async function checkExistingLeadershipRole(supabase: any, jabatan: string, idBidang: number): Promise<boolean> {
  if (!LEADERSHIP_ROLES.includes(jabatan)) return false;
  
  const { data } = await supabase
    .from("users")
    .select("user_id")
    .eq("jabatan", jabatan)
    .eq("id_bidang_fkey", idBidang)
    .maybeSingle();
    
  return !!data;
}

// ===== ADMIN AUTHORIZATION =====
async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  
  if (!user) return false;
  
  const { role } = await getUserRole(supabase, user.id);
  return role === 'Admin';
}

function requireAdmin(): Promise<ApiResponse> {
  return Promise.resolve({ success: false, message: "Access denied. Admin role required." });
}

// ===== AUTH ACTIONS =====
export const signUpAction = async (formData: FormData): Promise<ApiResponse> => {
  const fields = {
    email: formData.get("email")?.toString(),
    password: formData.get("password")?.toString(),
    nama: formData.get("nama")?.toString(),
    nip: formData.get("nip")?.toString(),
    pangkat: formData.get("pangkat")?.toString(),
    idBidang: formData.get("idBidang")?.toString(),
    jabatan: formData.get("jabatan")?.toString(),
  };

  // Validate required fields
  const validationError = validateRequiredFields(fields, Object.keys(fields));
  if (validationError) {
    return { success: false, type: "error", message: validationError };
  }

  const { email, password, nama, nip, pangkat, idBidang, jabatan } = fields;
  const role = determineUserRole(jabatan!);

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  // Parse and validate bidang ID
  const { value: parsedIdBidang, error: parseError } = parseIntSafely(idBidang!, "ID Bidang");
  if (parseError) {
    return { success: false, type: "error", message: parseError };
  }

  // Check for existing leadership roles
  if (await checkExistingLeadershipRole(supabase, jabatan!, parsedIdBidang!)) {
    return {
      success: false,
      type: "error",
      message: `Jabatan ${jabatan} sudah terdaftar di bidang ini`
    };
  }

  try {
    // Create auth user
    const { data, error } = await supabase.auth.signUp({
      email: email!,
      password: password!,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });

    if (error) throw new Error(error.message);

    const userId = data.user?.id;
    if (!userId) throw new Error("Gagal mendapatkan User ID");

    // Create user profile
    const { error: userError } = await supabase.from("users").insert([{
      user_id: userId,
      nama: nama!,
      nip: nip!,
      pangkat: pangkat!,
      email: email!,
      id_bidang_fkey: parsedIdBidang!,
      jabatan: jabatan!,
      role,
    }]);

    if (userError) throw userError;

    return { success: true, type: "success", message: "Pendaftaran Berhasil" };
  } catch (error: any) {
    console.error("SIGNUP_ACTION_ERROR:", error);
    return { success: false, type: "error", message: error.message || "Gagal melakukan pendaftaran" };
  }
};

export const signInAction = async (formData: FormData): Promise<ApiResponse> => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  if (!email || !password) {
    return { success: false, error: "Email dan password wajib diisi" };
  }

  const supabase = await createClient();

  try {
    // Authenticate user
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    // Log session after sign in
    const session = await supabase.auth.getSession();
    console.log('[AUTH DEBUG] Session after sign in:', session);

    // Get user and role
    const { user, error: userError } = await getAuthenticatedUser(supabase);
    if (userError || !user) throw new Error(userError || "Gagal mendapatkan data pengguna");

    const { role, error: roleError } = await getUserRole(supabase, user.id);
    if (roleError || !role) throw new Error(roleError || "Role pengguna tidak ditemukan");

    const redirectPath = ROLE_PATHS[role] || "/user";
    
    return { success: true, redirectTo: redirectPath };
  } catch (error: any) {
    console.error("SIGNIN_ACTION_ERROR:", error);
    return { success: false, error: error.message || "Terjadi kesalahan saat login" };
  }
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
    });

    if (error) throw error;

    if (callbackUrl) return redirect(callbackUrl);

    return encodedRedirect(
      "success",
      "/forgot-password",
      "Check your email for a link to reset your password.",
    );
  } catch (error: any) {
    console.error("FORGOT_PASSWORD_ERROR:", error);
    return encodedRedirect("error", "/forgot-password", "Could not reset password");
  }
};

export const resetPasswordAction = async (formData: FormData) => {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;

    return encodedRedirect("success", "/sign-in", "Password updated successfully. Please sign in.");
  } catch (error: any) {
    console.error("RESET_PASSWORD_ERROR:", error);
    return encodedRedirect("error", "/protected/reset-password", "Password update failed");
  }
};

export const signOutAction = async (): Promise<ApiResponse> => {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// ===== USER PROFILE ACTIONS =====
export async function getCurrentUserProfile(): Promise<ApiResponse> {
  const supabase = await createClient();
  const { user, error: authError } = await getAuthenticatedUser(supabase);

  if (authError || !user) {
    return { success: false, message: authError || "Sesi tidak ditemukan", data: null };
  }

  try {
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select(`
        user_id, nama, email, nip, pangkat, jabatan, role, id_bidang_fkey,
        daftar_bidang (nama_bidang)
      `)
      .eq("user_id", user.id)
      .single();

    if (profileError) throw profileError;
    return { success: true, data: userProfile };
  } catch (error: any) {
    console.error("GET_PROFILE_ERROR:", error);
    return { success: false, message: "Gagal mengambil data profil pengguna", data: null };
  }
}

export async function updateCurrentUserProfileAction(formData: FormData): Promise<ApiResponse> {
  const supabase = await createClient();
  const { user, error: authError } = await getAuthenticatedUser(supabase);

  if (authError || !user) {
    return { success: false, message: authError || "Sesi tidak ditemukan" };
  }

  const nama = formData.get("nama") as string;
  const nip = formData.get("nip") as string || null;
  const pangkat = formData.get("pangkat") as string || null;

  if (!nama) {
    return { success: false, message: "Nama wajib diisi" };
  }

  try {
    const { error } = await supabase
      .from("users")
      .update({ nama, nip, pangkat })
      .eq("user_id", user.id);

    if (error) throw error;
    return { success: true, message: "Profil berhasil diperbarui" };
  } catch (error: any) {
    console.error("UPDATE_PROFILE_ERROR:", error);
    return { success: false, message: "Gagal memperbarui profil" };
  }
}

// ===== ADMIN ACTIONS =====
export async function getUsersWithBidangAction(filterRole?: string): Promise<ApiResponse> {
  if (!(await isCurrentUserAdmin())) {
    return await requireAdmin();
  }

  const supabase = createAdminClient();
  
  try {
    let query = supabase
      .from("users")
      .select(`*, daftar_bidang (nama_bidang)`)
      .order("created_at", { ascending: false });

    if (filterRole && filterRole !== "Semua") {
      query = query.eq("role", filterRole);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return { success: true, data };
  } catch (error: any) {
    console.error("GET_USERS_ERROR:", error);
    return { success: false, message: "Gagal mengambil data pengguna" };
  }
}

export async function adminCreateUserAction(formData: FormData): Promise<ApiResponse> {
  if (!(await isCurrentUserAdmin())) {
    return await requireAdmin();
  }

  const fields = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    nama: formData.get("nama") as string,
    nip: formData.get("nip") as string || null,
    pangkat: formData.get("pangkat") as string || null,
    jabatan: formData.get("jabatan") as string,
    role: formData.get("role") as string,
    id_bidang_fkey_str: formData.get("id_bidang_fkey") as string,
  };

  // Validate required fields
  const requiredFields = ["email", "password", "nama", "jabatan", "role", "id_bidang_fkey_str"];
  const validationError = validateRequiredFields(fields, requiredFields);
  if (validationError) {
    return { success: false, message: validationError };
  }

  const { value: id_bidang_fkey, error: parseError } = parseIntSafely(fields.id_bidang_fkey_str, "ID Bidang");
  if (parseError) {
    return { success: false, message: parseError };
  }

  const supabase = createAdminClient();

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: fields.email,
      password: fields.password,
      email_confirm: true,
    });

    if (authError || !authData.user) throw authError || new Error("Gagal membuat pengguna");

    const userId = authData.user.id;

    // Insert user profile
    const { error: publicUserError } = await supabase.from("users").insert({
      user_id: userId,
      email: fields.email,
      nama: fields.nama,
      nip: fields.nip,
      pangkat: fields.pangkat,
      jabatan: fields.jabatan,
      role: fields.role,
      id_bidang_fkey: id_bidang_fkey!,
    });

    if (publicUserError) {
      // Cleanup on failure
      await supabase.auth.admin.deleteUser(userId);
      throw publicUserError;
    }

    return { success: true, message: "Pengguna berhasil dibuat" };
  } catch (error: any) {
    console.error("ADMIN_CREATE_USER_ERROR:", error);
    return { success: false, message: error.message || "Gagal membuat pengguna" };
  }
}

export async function adminUpdateUserAction(userId: string, formData: FormData): Promise<ApiResponse> {
  if (!(await isCurrentUserAdmin())) {
    return await requireAdmin();
  }

  const fields = {
    email: formData.get("email") as string,
    password: formData.get("password") as string | undefined,
    nama: formData.get("nama") as string,
    nip: formData.get("nip") as string || null,
    pangkat: formData.get("pangkat") as string || null,
    jabatan: formData.get("jabatan") as string,
    role: formData.get("role") as string,
    id_bidang_fkey_str: formData.get("id_bidang_fkey") as string,
  };

  // Validate required fields
  const requiredFields = ["email", "nama", "jabatan", "role", "id_bidang_fkey_str"];
  const validationError = validateRequiredFields(fields, requiredFields);
  if (validationError) {
    return { success: false, message: validationError };
  }

  const { value: id_bidang_fkey, error: parseError } = parseIntSafely(fields.id_bidang_fkey_str, "ID Bidang");
  if (parseError) {
    return { success: false, message: parseError };
  }

  const supabase = createAdminClient();

  try {
    // Update user profile
    const { error: publicUserError } = await supabase
      .from("users")
      .update({
        email: fields.email,
        nama: fields.nama,
        nip: fields.nip,
        pangkat: fields.pangkat,
        jabatan: fields.jabatan,
        role: fields.role,
        id_bidang_fkey: id_bidang_fkey!,
      })
      .eq("user_id", userId);

    if (publicUserError) throw publicUserError;

    // Update auth user if email or password changed
    const authUpdatePayload: { email?: string; password?: string } = {};
    if (fields.email) authUpdatePayload.email = fields.email;
    if (fields.password) authUpdatePayload.password = fields.password;

    if (Object.keys(authUpdatePayload).length > 0) {
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, authUpdatePayload);
      if (authError) throw authError;
    }

    return { success: true, message: "Pengguna berhasil diperbarui" };
  } catch (error: any) {
    console.error("ADMIN_UPDATE_USER_ERROR:", error);
    return { success: false, message: error.message || "Gagal memperbarui pengguna" };
  }
}

export async function adminDeleteUserAction(userId: string): Promise<ApiResponse> {
  if (!(await isCurrentUserAdmin())) {
    return await requireAdmin();
  }

  const supabase = createAdminClient();
  
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
    
    return { success: true, message: "Pengguna berhasil dihapus" };
  } catch (error: any) {
    console.error("ADMIN_DELETE_USER_ERROR:", error);
    return { success: false, message: error.message || "Gagal menghapus pengguna" };
  }
}