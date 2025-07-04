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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error sending notification:", error.message);
    } else {
      console.error("Error sending notification:", error);
    }
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error sending notifications to role ${role}:`, error.message);
    } else {
      console.error(`Error sending notifications to role ${role}:`, error);
    }
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Gagal mengirim notifikasi ke Kepala Bidang bidang:", error.message);
    } else {
      console.error("Gagal mengirim notifikasi ke Kepala Bidang bidang:", error);
    }
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error fetching notifications:", error.message);
    } else {
      console.error("Error fetching notifications:", error);
    }
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error fetching unread notification count:", error.message);
    } else {
      console.error("Error fetching unread notification count:", error);
    }
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error marking notification as read:", error.message);
    } else {
      console.error("Error marking notification as read:", error);
    }
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error marking all notifications as read:", error.message);
    } else {
      console.error("Error marking all notifications as read:", error);
    }
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error deleting notification:", error.message);
    } else {
      console.error("Error deleting notification:", error);
    }
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error deleting read notifications:", error.message);
    } else {
      console.error("Error deleting read notifications:", error);
    }
    return false;
  }
}


// // Fungsi baru untuk mengirim notifikasi terkait retensi arsip
// export async function sendArchiveRetentionAlert(
//   userId: string,
//   archiveInfo: {
//     id: string; // id_arsip_aktif
//     kodeKlasifikasi: string;
//     uraianInformasi: string;
//   },
//   selisihHari: number, // Positif: hari tersisa; Negatif: hari terlewat; 0: jatuh tempo hari ini
//   baseDetailPath: string = "/arsip/arsip-aktif/detail/" // Path dasar untuk link detail
// ): Promise<boolean> {
//   let title = "";
//   let message = "";
//   const linkToArchive = `${baseDetailPath}${archiveInfo.id}`;
//   const relatedEntityConst = "arsip_retensi_alert";

//   if (selisihHari < 0) {
//     title = "Peringatan: Arsip Telah Jatuh Tempo";
//     message = `Arsip "${archiveInfo.kodeKlasifikasi} - ${archiveInfo.uraianInformasi}" telah melewati tanggal jatuh tempo ${Math.abs(selisihHari)} hari yang lalu. Segera tindak lanjuti.`;
//   } else if (selisihHari === 0) {
//     title = "Peringatan: Arsip Jatuh Tempo Hari Ini";
//     message = `Arsip "${archiveInfo.kodeKlasifikasi} - ${archiveInfo.uraianInformasi}" jatuh tempo hari ini. Segera tindak lanjuti.`;
//   } else { // selisihHari > 0 && selisihHari <= 30 (diasumsikan pemanggil sudah memfilter ini)
//     title = "Pemberitahuan: Arsip Mendekati Jatuh Tempo";
//     message = `Arsip "${archiveInfo.kodeKlasifikasi} - ${archiveInfo.uraianInformasi}" akan jatuh tempo dalam ${selisihHari} hari. Mohon persiapkan tindak lanjut.`;
//   }

//   try {
//     // Opsional: Cek apakah notifikasi serupa yang belum dibaca sudah ada untuk menghindari duplikasi berlebih
//     const { data: existingUnread, error: checkError } = await supabase
//       .from("notifications")
//       .select("id_notif")
//       .eq("user_id", userId)
//       .eq("link", linkToArchive) // Cek berdasarkan link ke arsip yang sama
//       .eq("related_entity", relatedEntityConst)
//       .eq("is_read", false)
//       // Anda bisa menambahkan filter berdasarkan `title` atau `message` jika ingin lebih spesifik
//       // Namun, ini bisa jadi terlalu ketat. Cukup dengan link dan related_entity mungkin sudah cukup.
//       .limit(1);

//     if (checkError) {
//       console.error("Error checking existing unread retention notifications:", checkError.message);
//       // Lanjutkan pengiriman meskipun pengecekan gagal
//     }

//     if (existingUnread && existingUnread.length > 0) {
//       console.log(`Notifikasi retensi yang belum dibaca untuk arsip ${archiveInfo.id} sudah ada untuk pengguna ${userId}. Pengiriman dilewati.`);
//       return true; // Anggap berhasil karena notifikasi sudah ada
//     }

//     return await sendUserNotification(
//       userId,
//       title,
//       message,
//       linkToArchive,
//       relatedEntityConst // Gunakan related_entity yang spesifik
//     );
//   } catch (error: any) {
//     console.error(`Error in sendArchiveRetentionAlert for archive ${archiveInfo.id}:`, error.message || error);
//     return false;
//   }
// }