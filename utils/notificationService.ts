import { createClient } from "./supabase/client"; // <-- Ubah import
import { Notification } from "@/types/Notification";

const supabase = createClient(); // <-- Buat instance Supabase untuk modul ini

// Tipe data untuk peran pengguna
export type UserRole = "Pegawai" | "Kepala_Bidang" | "Sekretaris" | "Admin"; 

// Interface untuk representasi pengguna
export interface User {
  id: string;
  role: UserRole;
}

// Tipe data untuk filter notifikasi
export interface NotificationFilter {
  isRead?: boolean;
  relatedEntity?: string;
  limit?: number;
  page?: number;
}

// Kirim notifikasi ke satu pengguna tertentu
export async function sendUserNotification(
  userId: string,
  title: string,
  message: string,
  link: string = "",
  relatedEntity?: string,
): Promise<boolean> {
  try {
    // 1. Simpan notifikasi ke DB
    const { error } = await supabase.from("notifications").insert([
      {
        user_id: userId,
        title,
        message,
        link,
        related_entity: relatedEntity,
      },
    ]);

    if (error) throw error;

    // Logika pengiriman email dihapus

    return true;
  } catch (error: any) {
    console.error("Error sending notification:", error.message || error);
    return false;
  }
}

// Kirim notifikasi ke semua pengguna dengan peran tertentu
export async function sendRoleNotification(
  role: UserRole,
  title: string,
  message: string,
  link: string = "",
  relatedEntity?: string,
): Promise<boolean> {
  try {
    // Dapatkan semua pengguna dengan peran tertentu
    const { data: usersData, error: userError } = await supabase
      .from("users")
      .select("user_id, email") // Ganti id menjadi user_id
      .eq("role", role);

    if (userError) throw userError;
    if (!usersData || usersData.length === 0) {
      console.log(`No users found with role: ${role}`);
      return false;
    }

    // Buat array notifikasi DB
    const notificationsDB = usersData.map(user => ({
      user_id: user.user_id, // Ganti id menjadi user_id
      title,
      message,
      link,
      related_entity: relatedEntity,
    }));

    // Masukkan semua notifikasi sekaligus
    const { error } = await supabase.from("notifications").insert(notificationsDB);

    if (error) throw error;

    // Logika pengiriman email dihapus

    return true;
  } catch (error: any) {
    console.error(`Error sending notifications to role ${role}:`, error.message || error);
    return false;
  }
}


export async function sendDepartmentHeadNotification(
  idBidang: number | null, 
  title: string,
  message: string,
  link: string = "",
  relatedEntity?: string,
): Promise<boolean> {
  try {
    if (!idBidang) {
      console.warn("sendDepartmentHeadNotification: idBidang is required");
      return false;
    }

    // Cari kepala bidang di bidang tertentu (berdasarkan id_bidang_fkey)
    const { data: departmentHeadsData, error: queryError } = await supabase
      .from("users")
      .select("user_id, email")
      .eq("id_bidang_fkey", idBidang)
      .eq("role", "Kepala_Bidang");

    if (queryError) {
      console.error("Error querying department heads:", queryError);
      throw queryError;
    }

    if (!departmentHeadsData || departmentHeadsData.length === 0) {
      console.log(`Tidak ada Kepala Bidang dengan id_bidang_fkey: ${idBidang}`);
      return false;
    }

    // Siapkan array notifikasi
    const notificationsDB = departmentHeadsData.map((head) => ({
      user_id: head.user_id,
      title,
      message,
      link,
      related_entity: relatedEntity,
      is_read: false,
    }));

    // Kirim ke Supabase
    const { error: insertError } = await supabase.from("notifications").insert(notificationsDB);

    if (insertError) {
      console.error("Error inserting notifications:", insertError);
      throw insertError;
    }

    // Logika pengiriman email dihapus

    return true;
  } catch (error: any) {
    console.error("Gagal mengirim notifikasi ke Kepala Bidang bidang:", error.message || error);
    return false;
  }
}

// Kirim notifikasi ke beberapa peran sekaligus
export async function sendMultiRoleNotification(
  roles: UserRole[],
  title: string,
  message: string,
  link: string = "",
  relatedEntity?: string,
  relatedId?: number
): Promise<boolean> {
  try {
    const results = await Promise.all(
      roles.map(role => 
        sendRoleNotification(role, title, message, link, relatedEntity)
      )
    );
    
    // Kembalikan true hanya jika semua notifikasi berhasil dikirim
    return results.every(result => result === true);
  } catch (error: any) {
    console.error("Error sending multi-role notifications:", error.message || error);
    return false;
  }
}

// Kirim notifikasi keseluruh departemen (misalnya untuk semua pegawai dalam bidang tertentu)
export async function sendDepartmentNotification(
  bidang: string,
  title: string,
  message: string,
  link: string = "",
  relatedEntity?: string,
  relatedId?: number
): Promise<boolean> {
  try {
    // Dapatkan semua pengguna dalam departemen tertentu
    const { data: usersData, error: userError } = await supabase
      .from("users")
      .select("user_id, email") // Ganti id menjadi user_id
      .eq("bidang", bidang);

    if (userError) throw userError;
    if (!usersData || usersData.length === 0) {
      console.log(`No users found in department: ${bidang}`);
      return false;
    }

    // Buat array notifikasi untuk semua pengguna dalam departemen
    const notifications = usersData.map(user => ({
      user_id: user.user_id, // Ganti id menjadi user_id
      title,
      message,
      link,
      related_entity: relatedEntity,
      related_id: relatedId,
    }));

    // Masukkan semua notifikasi sekaligus
    const { error } = await supabase.from("notifications").insert(notifications);

    if (error) throw error;

    // Logika pengiriman email dihapus

    return true;
  } catch (error: any) {
    console.error(`Error sending notifications to department ${bidang}:`, error.message || error);
    return false;
  }
}

// Dapatkan notifikasi pengguna saat ini dengan filter
export async function getUserNotifications(filter: NotificationFilter = {}): Promise<Notification[]> {
  try {
    // Dapatkan pengguna saat ini
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("User not authenticated");

    // Buat query dasar
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id);

    // Terapkan filter
    if (filter.isRead !== undefined) {
      query = query.eq("is_read", filter.isRead);
    }
    
    if (filter.relatedEntity) {
      query = query.eq("related_entity", filter.relatedEntity);
    }
    
    // Terapkan pagination jika diperlukan
    if (filter.limit) {
      query = query.limit(filter.limit);
      
      if (filter.page && filter.page > 1) {
        const offset = (filter.page - 1) * filter.limit;
        query = query.range(offset, offset + filter.limit - 1);
      }
    }
    
    // Selalu urutkan dari yang terbaru
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error("Error fetching notifications:", error.message || error);
    return [];
  }
}

// Dapatkan notifikasi yang belum dibaca untuk pengguna saat ini
export async function getUnreadNotifications(): Promise<Notification[]> {
  return getUserNotifications({ isRead: false });
}

// Dapatkan jumlah notifikasi yang belum dibaca
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("User not authenticated");

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) throw error;
    return count || 0;
  } catch (error: any) {
    console.error("Error fetching unread notification count:", error.message || error);
    return 0;
  }
}

// Tandai notifikasi sebagai sudah dibaca
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id_notif", notificationId); // <-- Ganti 'id' menjadi 'id_notif'

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error("Error marking notification as read:", error.message || error);
    return false;
  }
}

// Tandai semua notifikasi sebagai sudah dibaca untuk pengguna saat ini
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error.message || error);
    return false;
  }
}

// Hapus notifikasi
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id_notif", notificationId); // <-- Ganti 'id' menjadi 'id_notif'

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error("Error deleting notification:", error.message || error);
    return false;
  }
}

// Hapus semua notifikasi yang sudah dibaca untuk pengguna saat ini
export async function deleteAllReadNotifications(): Promise<boolean> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("is_read", true);

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error("Error deleting read notifications:", error.message || error);
    return false;
  }
}

// Contoh penggunaan untuk mengirim notifikasi berdasarkan peran
export async function notifyAboutNewTask(
  taskId: number,
  taskTitle: string,
  assignedTo: string,
  departmentId: string
): Promise<void> {
  // Notifikasi untuk pegawai yang ditugaskan
  await sendUserNotification(
    assignedTo,
    "Tugas Baru",
    `Anda telah ditugaskan tugas baru: ${taskTitle}`,
    `/tasks/${taskId}`,
    "task",
  );
  
  // Notifikasi untuk kepala bidang dari departemen tersebut
  await sendRoleNotification(
    "Kepala_Bidang",
    "Tugas Baru Dibuat",
    `Tugas baru telah dibuat di departemen Anda: ${taskTitle}`,
    `/tasks/${taskId}`,
    "task",
  );
  
  // Notifikasi untuk admin (untuk tujuan pencatatan)
  await sendRoleNotification(
    "Admin",
    "Tugas Baru Sistem",
    `Tugas baru telah dibuat: ${taskTitle}`,
    `/admin/tasks`,
    "task",
  );
}