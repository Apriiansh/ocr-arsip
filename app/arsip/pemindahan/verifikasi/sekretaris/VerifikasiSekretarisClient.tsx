"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { FileText, Check, X, Eye, Inbox, AlertTriangle, User, CalendarDays, Building } from "lucide-react";
import Link from "next/link";
import { sendUserNotification } from "@/utils/notificationService";
import { useAuth } from "@/context/AuthContext";
import Loading from "./loading"; // Impor komponen Loading

interface VerificationRequest {
  id: string;
  user_id: string;
  berita_acara: {
    nomor_berita_acara: string;
    tanggal_berita_acara: string;
  } | null;
  approval_status: { // Struktur approval_status diubah menjadi objek detail
    kepala_bidang: {
      status: "Menunggu" | "Disetujui" | "Ditolak";
      verified_by: string | null;
      verified_at: string | null;
    };
    sekretaris: {
      status: "Menunggu" | "Disetujui" | "Ditolak";
      verified_by: string | null;
      verified_at: string | null;
    };
  } | null;
  created_at: string;
  user: {
    user_id: string;
    nama: string;
    daftar_bidang: {
      nama_bidang: string;
    }
  }
}

// Make sure approval_status is properly initialized when missing
const getDefaultApprovalStatus = () => {
  return {
    kepala_bidang: {
      status: "Menunggu",
      verified_by: null,
      verified_at: null,
    },
    sekretaris: {
      status: "Menunggu",
      verified_by: null,
      verified_at: null,
    }
  };
}

export default function VerifikasiSekretarisClient() {
  const supabase = createClient();
  const router = useRouter();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [historyRequests, setHistoryRequests] = useState<VerificationRequest[]>([]); 
  const { user, isLoading: isAuthLoading, error: authError } = useAuth(); 
  const [dataLoading, setDataLoading] = useState(true); 

  const fetchRequests = useCallback(async () => {
    try {
      setDataLoading(true);
      console.log("Fetching requests for role: Sekretaris");
 
      let pendingQuery = supabase
        .from("pemindahan_process")
        .select(`
          id,
          user_id,
          berita_acara,
          approval_status,
          created_at
        `)
        .order("created_at", { ascending: false });

      pendingQuery = pendingQuery.eq('approval_status->kepala_bidang->>status', 'Disetujui');
      pendingQuery = pendingQuery.eq('approval_status->sekretaris->>status', 'Menunggu');

      const { data: pendingProcessData, error: pendingProcessError } = await pendingQuery;

      if (pendingProcessError) {
        toast.error("Gagal mengambil data proses menunggu: " + pendingProcessError.message);
        console.error("Error fetching pending process data:", pendingProcessError);
        // Don't throw, try to fetch history
      }

      let historyQuery = supabase
        .from("pemindahan_process")
        .select(`
          id,
          user_id,
          berita_acara,
          approval_status,
          created_at
        `)
        .order("approval_status->sekretaris->>verified_at", { ascending: false }); // Urutkan berdasarkan tanggal verifikasi Sekretaris

      // Filter untuk yang sudah diverifikasi (Disetujui atau Ditolak) OLEH Sekretaris ini
      historyQuery = historyQuery.in('approval_status->sekretaris->>status', ['Disetujui', 'Ditolak']);
      if (user?.id) { // Gunakan user.id dari context
        historyQuery = historyQuery.eq('approval_status->sekretaris->>verified_by', user.id);
      }

      const { data: historyProcessData, error: historyProcessError } = await historyQuery;

      if (historyProcessError) {
        toast.error("Gagal mengambil data riwayat proses: " + historyProcessError.message);
        console.error("Error fetching history process data:", historyProcessError);
      }

      if ((!pendingProcessData || pendingProcessData.length === 0) && (!historyProcessData || historyProcessData.length === 0)) {
        console.log("No pending or history process data found");
        setRequests([]);
        setHistoryRequests([]);
        setDataLoading(false);
        return;
      }

      console.log(`Found ${pendingProcessData ? pendingProcessData.length : 0} pending process records`);

      // Get user details for each request
      const processUserDetails = async (process: any) => { // Helper function
        try {
          console.log(`Fetching user data for user_id: ${process.user_id}`);
          // Fetch user data with proper error handling
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select(`
              user_id,
              nama,
              id_bidang_fkey
            `)
            .eq("user_id", process.user_id)
            .maybeSingle(); // Use maybeSingle instead of single to prevent errors when no user is found

          if (userError) {
            console.error(`Error fetching user data for ${process.user_id}:`, userError);
            // Return process with placeholder user data
            return {
              ...process,
              user: {
                user_id: process.user_id,
                nama: "User tidak ditemukan",
                daftar_bidang: { nama_bidang: "Bidang tidak diketahui" }
              }
            };
          }

          if (!userData) {
            console.warn(`No user data found for user_id: ${process.user_id}`);
            // Return process with placeholder user data
            return {
              ...process,
              user: {
                user_id: process.user_id,
                nama: "User tidak ditemukan",
                daftar_bidang: { nama_bidang: "Bidang tidak diketahui" }
              }
            };
          }

          // Fetch bidang data if available
          let bidangData = { nama_bidang: "Bidang Tidak Diketahui" };

          if (userData.id_bidang_fkey) {
            console.log(`Fetching bidang data for id_bidang: ${userData.id_bidang_fkey}`);
            const { data: bidang, error: bidangError } = await supabase
              .from("daftar_bidang")
              .select("nama_bidang")
              .eq("id_bidang", userData.id_bidang_fkey)
              .maybeSingle(); // Use maybeSingle instead of single

            if (bidangError) {
              console.error(`Error fetching bidang data for ${userData.id_bidang_fkey}:`, bidangError);
            } else if (bidang) {
              bidangData = bidang;
              console.log(`Found bidang: ${bidang.nama_bidang}`);
            } else {
              console.warn(`No bidang data found for id_bidang: ${userData.id_bidang_fkey}`);
            }
          }

          // Create complete data structure
          return {
            ...process,
            user: {
              user_id: userData.user_id,
              nama: userData.nama || "Nama tidak tersedia",
              daftar_bidang: bidangData
            }
          };
        } catch (error) {
          console.error(`Error processing request for user_id ${process.user_id}:`, error);
          // Return process with error indication
          return {
            ...process,
            user: {
              user_id: process.user_id,
              nama: "Error memuat data",
              daftar_bidang: { nama_bidang: "Error memuat data" }
            }
          };
        }
      };

      // Process PENDING requests
      if (pendingProcessData) {
        console.log(`Found ${pendingProcessData.length} pending process records`);
        const pendingWithDetailsPromises = pendingProcessData.map(processUserDetails);
        const resolvedPendingProcesses = (await Promise.all(pendingWithDetailsPromises));
        const validPendingProcesses = resolvedPendingProcesses.filter(p => p !== null) as VerificationRequest[];
        console.log(`Filtered to ${validPendingProcesses.length} valid pending processes`);
        setRequests(validPendingProcesses || []);
      }

      // Process HISTORY requests
      if (historyProcessData) {
        console.log(`Found ${historyProcessData.length} history process records`);
        const historyWithDetailsPromises = historyProcessData.map(processUserDetails);
        const resolvedHistoryProcesses = (await Promise.all(historyWithDetailsPromises));
        const validHistoryProcesses = resolvedHistoryProcesses.filter(p => p !== null) as VerificationRequest[];
        console.log(`Filtered to ${validHistoryProcesses.length} valid history processes`);
        setHistoryRequests(validHistoryProcesses || []);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Gagal memuat data permintaan");
    } finally {
      setDataLoading(false);
    }
  }, [supabase, user]); // Ganti currentUserId dengan user

  useEffect(() => {
    const fetchDataBasedOnAuth = async () => {
      // Jika AuthContext masih loading, tunggu
      if (isAuthLoading) return;

      // Jika ada error dari AuthContext, tampilkan dan jangan lanjutkan
      if (authError) {
        toast.error(`Error Autentikasi: ${authError}`);
        setDataLoading(false);
        return;
      }

      // Jika tidak ada user setelah AuthContext selesai loading, redirect (AuthContext seharusnya sudah melakukan ini)
      if (!user) {
        setDataLoading(false);
        return;
      }

      // Verifikasi role pengguna
      if (user.role !== "Sekretaris") {
        toast.error("Anda tidak memiliki akses ke halaman ini.");
        router.push("/"); // atau halaman default yang sesuai
        setDataLoading(false);
        return;
      }

      // Jika semua pengecekan lolos, panggil fetchRequests
      fetchRequests();
    };
    fetchDataBasedOnAuth();
  }, [user, isAuthLoading, authError, router, fetchRequests]);

  const handleVerification = async (id: string, isApproved: boolean) => {
    try {
      const statusField = "sekretaris"; // Pasti Sekretaris
      const newStatus = isApproved ? "Disetujui" : "Ditolak";
      // Gunakan user.id dari context
      if (!user?.id) {
        toast.error("Sesi pengguna tidak valid. Silakan login kembali.");
        return;
      }

      console.log(`Updating approval status for request ${id} to ${newStatus} by ${statusField}`);

      // Get current approval status
      const { data: currentData, error: fetchError } = await supabase
        .from("pemindahan_process")
        .select("approval_status")
        .eq("id", id)
        .maybeSingle(); // Use maybeSingle instead of single

      if (fetchError) {
        console.error("Error fetching current status:", fetchError);
        throw fetchError;
      }

      if (!currentData) {
        console.error("No data found for id:", id);
        toast.error("Data tidak ditemukan");
        return;
      }

      // Handle case where approval_status might be null
      const currentApprovalStatus = currentData.approval_status || getDefaultApprovalStatus();
      console.log("Current approval status:", currentApprovalStatus);

      // Update approval status
      const updatedApprovalStatus = {
        ...currentApprovalStatus,
        [statusField]: { // Ubah menjadi objek
          status: newStatus,
          verified_by: user.id, // Gunakan user.id dari context
          verified_at: new Date().toISOString(),
        }
      };

      console.log("Updated approval status:", updatedApprovalStatus);

      const { error } = await supabase
        .from("pemindahan_process")
        .update({ approval_status: updatedApprovalStatus })
        .eq("id", id);

      if (error) {
        console.error("Error updating status:", error);
        throw error;
      }

      console.log("Status updated successfully");

      // Send notification to the user
      const request = requests.find((r: VerificationRequest) => r.id === id);
      if (request) {
        const notificationTitle = "Status Pemindahan Arsip";
        const notificationMessage = `Pengajuan pemindahan arsip dengan nomor ${request.berita_acara?.nomor_berita_acara || 'N/A'} telah ${newStatus.toLowerCase()} oleh Kepala Bidang dan Sekretaris.`;
        const link = `/arsip/pemindahan/detail/${id}`;

        try {
          await sendUserNotification(
            request.user_id,
            notificationTitle,
            notificationMessage,
            link,
            "pemindahan arsip telah diverifikasi"
          );
        } catch (notifError) {
          toast.warning("Status berhasil diubah, tapi notifikasi gagal dikirim.");
        }
      }

      toast.success(`Berhasil ${isApproved ? "menyetujui" : "menolak"} permintaan`);
      await fetchRequests();

    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(`Gagal memperbarui status: ${error.message || "Unknown error"}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      // hour: "2-digit", // minute: "2-digit" // Jika ingin menampilkan jam juga
    });
  };

  // Tampilkan loading jika AuthContext masih loading atau data sedang dimuat
  if (isAuthLoading || dataLoading) {
    return <Loading />; // Gunakan komponen Loading yang sudah diimpor
  }

  if (authError) {
    return <div className="flex items-center justify-center h-full text-red-500">Error Autentikasi: {authError}</div>;
  }

  return (
    <div className="w-full h-full p-6"> {/* Consistent page padding */}
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col"> {/* Content wrapper */}
        <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col"> {/* Main content card */}
          {/* Header inside card */}
          <div className="bg-primary/10 px-6 py-4">
            <h1 className="text-2xl font-bold text-primary">Verifikasi Pemindahan Arsip - Sekretaris</h1>
            <p className="text-sm text-muted-foreground mt-1">Daftar pengajuan pemindahan arsip yang memerlukan persetujuan Anda.</p>
          </div>

          {/* Content Area */}
          <div className="p-6 flex-grow overflow-y-auto"> {/* Scrollable content area */}
            {requests.length === 0 && historyRequests.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 dark:bg-muted/20 border border-border/40 rounded-lg shadow-md flex flex-col items-center justify-center h-full">
                <Inbox className="mx-auto h-16 w-16 text-primary/70 mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Tidak Ada Data Verifikasi</h3>
                <p className="text-muted-foreground">Saat ini tidak ada pengajuan pemindahan arsip yang menunggu verifikasi Anda atau riwayat verifikasi.</p>
              </div>
            ) : (
              <>
                {/* Permintaan Baru Section */}
                {requests.length > 0 && (
                  <div className="mb-10">
                    <h2 className="text-xl font-semibold text-foreground mb-4">Permintaan Verifikasi Baru</h2>
                    <div className="space-y-6">
                      {requests.map((request) => (
                        <div key={request.id} className="bg-card border border-border rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg">
                          <div className="p-5"> {/* Adjusted padding */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                              <div className="mb-3 sm:mb-0">
                                <h3 className="text-lg font-semibold text-primary flex items-center">
                                  <FileText className="h-5 w-5 mr-2" />
                                  Pemindahan ({request.berita_acara?.tanggal_berita_acara ? formatDate(request.berita_acara.tanggal_berita_acara) : <span className="italic text-muted-foreground">Tanggal Belum Ada</span>})
                                </h3>
                                {/* ID Proses dihilangkan
                                <p className="text-xs text-muted-foreground mt-1">
                                  ID Proses: {request.id}
                                </p> */}
                              </div>
                              <span
                                className={`px-3 py-1.5 text-xs font-medium rounded-full inline-flex items-center
                                  ${(request.approval_status?.sekretaris?.status || 'Menunggu') === "Menunggu" ? "bg-yellow-500/10 text-yellow-500" : ""}
                                  ${(request.approval_status?.sekretaris?.status) === "Disetujui" ? "bg-green-500/10 text-green-500" : ""}
                                  ${(request.approval_status?.sekretaris?.status) === "Ditolak" ? "bg-red-500/10 text-red-500" : ""}`}
                              >
                                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                                Status Anda: {request.approval_status?.sekretaris?.status || 'Menunggu'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-5 text-sm">
                              <div className="flex items-center text-foreground">
                                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                <strong>Pengaju:</strong>&nbsp;{request.user?.nama || <span className="italic text-muted-foreground">Tidak Diketahui</span>}
                              </div>
                              <div className="flex items-center text-foreground">
                                <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                                <strong>Bidang Pengaju:</strong>&nbsp;{request.user?.daftar_bidang?.nama_bidang?.replace(/_/g, " ") || <span className="italic text-muted-foreground">Tidak Diketahui</span>}
                              </div>
                              <div className="flex items-center text-foreground">
                                <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                                <strong>Tgl. Pengajuan:</strong>&nbsp;
                                {request.created_at ? formatDate(request.created_at) : <span className="italic text-muted-foreground">Tidak Ada</span>}
                              </div>
                              <div className="flex items-center text-foreground">
                                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                                <strong>No. Berita Acara:</strong>&nbsp;
                                {request.berita_acara?.nomor_berita_acara || <span className="italic text-muted-foreground">Belum Ada</span>}
                              </div>
                            </div>

                            <div className="mb-5 text-sm">
                              <p className="font-medium text-muted-foreground">Status Persetujuan Lain:</p>
                              <div className="ml-4 mt-1">
                                <span className="text-foreground">Kepala Bidang: </span>
                                <span className={`font-semibold 
                                    ${(request.approval_status?.kepala_bidang?.status || 'Menunggu') === "Disetujui" ? "text-green-500" :
                                      (request.approval_status?.kepala_bidang?.status || 'Menunggu') === "Ditolak" ? "text-red-500" :
                                      "text-yellow-500"}`}>
                                  {request.approval_status?.kepala_bidang?.status || 'Menunggu'}
                                  </span>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-border">
                              <Link
                                href={`/arsip/pemindahan/detail/${request.id}?role=sekretaris`}
                                className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center gap-2 transition-colors"
                              >
                                <Eye size={16} />
                                Detail
                              </Link>
                              <button
                                onClick={() => handleVerification(request.id, true)}
                                className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center justify-center gap-2 transition-colors"
                              >
                                <Check size={16} />
                                Setuju
                              </button>
                              <button
                                onClick={() => handleVerification(request.id, false)}
                                className="w-full sm:w-auto px-4 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-lg hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 flex items-center justify-center gap-2 transition-colors"
                              >
                                <X size={16} />
                                Tolak
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Riwayat Verifikasi Section */}
                {historyRequests.length > 0 && (
                  <div className="mt-10">
                    <h2 className="text-xl font-semibold text-foreground mb-4">Riwayat Verifikasi Anda</h2>
                    <div className="space-y-6">
                      {historyRequests.map((request) => (
                        <div key={`hist-${request.id}`} className="bg-muted/40 dark:bg-muted/20 border border-border/40 rounded-lg shadow-md overflow-hidden opacity-90">
                          <div className="p-5"> {/* Adjusted padding */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                              <div className="mb-3 sm:mb-0">
                                <h3 className="text-base font-semibold text-foreground flex items-center">
                                  <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                                  Pemindahan ({request.berita_acara?.tanggal_berita_acara ? formatDate(request.berita_acara.tanggal_berita_acara) : <span className="italic text-muted-foreground">Tanggal Belum Ada</span>})
                                </h3>
                                {/* ID Proses dihilangkan
                                <p className="text-xs text-muted-foreground/80 mt-1">
                                  ID Proses: {request.id}
                                </p> */}
                              </div>
                              <span
                                className={`px-3 py-1.5 text-xs font-medium rounded-full inline-flex items-center
                                  ${(request.approval_status?.sekretaris?.status) === "Disetujui" ? "bg-green-500/10 text-green-500" : ""}
                                  ${(request.approval_status?.sekretaris?.status) === "Ditolak" ? "bg-red-500/10 text-red-500" : ""}`}
                              >
                                {request.approval_status?.sekretaris?.status === "Disetujui" ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <X className="h-3.5 w-3.5 mr-1.5" />}
                                Status Anda: {request.approval_status?.sekretaris?.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-5 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                <strong>Pengaju:</strong>&nbsp;{request.user?.nama || <span className="italic">Tidak Diketahui</span>}
                              </div>
                              <div className="flex items-center">
                                <Building className="h-4 w-4 mr-2" />
                                <strong>Bidang Pengaju:</strong>&nbsp;{request.user?.daftar_bidang?.nama_bidang?.replace(/_/g, " ") || <span className="italic">Tidak Diketahui</span>}
                              </div>
                              <div className="flex items-center">
                                <CalendarDays className="h-4 w-4 mr-2" />
                                <strong>Tgl. Verifikasi Anda:</strong>&nbsp;
                                {request.approval_status?.sekretaris?.verified_at ? formatDate(request.approval_status.sekretaris.verified_at) : <span className="italic">N/A</span>}
                              </div>
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                <strong>No. Berita Acara:</strong>&nbsp;
                                {request.berita_acara?.nomor_berita_acara || <span className="italic text-muted-foreground">Belum Ada</span>}
                              </div>
                            </div>
                            <div className="pt-4 border-t border-border/50 flex justify-end">
                              <Link
                                  href={`/arsip/pemindahan/detail/${request.id}?role=sekretaris`}
                                  className="px-4 py-2 bg-muted text-muted-foreground text-sm font-medium rounded-lg hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-center gap-2 transition-colors"
                                >
                                  <Eye size={16} /> Lihat Detail
                                </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}