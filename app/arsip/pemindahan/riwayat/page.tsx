"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Eye, PlayCircle, CheckCircle, Clock, ListFilter, Search, Trash2, FileText } from "lucide-react"; // Added FileText
import Link from "next/link";
import { SIGN_IN_PATH, DEFAULT_HOME_PATH, ALLOWED_ROLES } from "../utils"; // Sesuaikan path jika perlu

interface PemindahanProcess {
  id: string;
  user_id: string;
  current_step: number;
  berita_acara: {
    nomor_berita_acara: string;
    tanggal_berita_acara: string;
  } | null;
  approval_status: {
    kepala_bidang: { status: string };
    sekretaris: { status: string };
  } | null;
  process_status: {
    status: string;
  } | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  user?: { // Tambahkan user untuk menampilkan nama pengaju
    nama: string;
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    // hour: "2-digit", // Removed time part for cleaner display in list
    // minute: "2-digit",
  });
};

// Skeleton Loader Component for Riwayat Page
const RiwayatLoadingSkeleton = () => {
  return (
    <div className="w-full h-full p-6">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
        <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
          {/* Header (can be static or skeletonized) */}
          <div className="bg-primary/10 px-6 py-4">
            <div className="h-7 w-1/2 bg-primary/20 rounded"></div>
            <div className="h-4 w-3/4 bg-primary/20 rounded mt-2"></div>
          </div>

          {/* Search and Filter Skeleton */}
          <div className="p-6 border-b border-border/50 flex flex-col md:flex-row gap-4 items-center animate-pulse">
            <div className="h-11 w-full md:flex-grow bg-muted/50 rounded-lg"></div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-20 bg-muted/50 rounded-md"></div>
              <div className="h-9 w-20 bg-muted/50 rounded-md"></div>
              <div className="h-9 w-20 bg-muted/50 rounded-md"></div>
            </div>
          </div>

          {/* Content Area Skeleton */}
          <div className="p-6 flex-grow overflow-y-auto animate-pulse">
            <div className="space-y-6">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="bg-card border border-border rounded-lg p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                    <div className="h-6 w-3/5 bg-muted/40 rounded mb-1 sm:mb-0"></div>
                    <div className="h-6 w-24 bg-muted/40 rounded"></div>
                  </div>
                  <div className="h-4 w-1/2 bg-muted/40 rounded mb-2"></div>
                  <div className="h-4 w-2/3 bg-muted/40 rounded mb-2"></div>
                  <div className="h-4 w-1/2 bg-muted/40 rounded mb-2"></div>
                  <div className="h-4 w-1/2 bg-muted/40 rounded mb-2"></div>
                  <div className="h-4 w-1/3 bg-muted/40 rounded mt-1"></div>
                  <div className="mt-4 flex gap-3 flex-wrap">
                    <div className="h-9 w-28 bg-muted/40 rounded-lg"></div>
                    <div className="h-9 w-36 bg-muted/40 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function RiwayatPemindahanPage() {
  const supabase = createClient();
  const router = useRouter();
  const [processes, setProcesses] = useState<PemindahanProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending">("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(SIGN_IN_PATH);
        return;
      }
      setUserId(session.user.id);

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (userError || !userData) {
        toast.error("Gagal memuat data pengguna.");
        router.push(SIGN_IN_PATH);
        return;
      }
      setUserRole(userData.role);

      if (!ALLOWED_ROLES.includes(userData.role)) {
        toast.warn("Anda tidak memiliki izin untuk mengakses halaman ini.");
        router.push(DEFAULT_HOME_PATH);
        return;
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, [router, supabase]);

  const fetchProcesses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    let query = supabase
      .from("pemindahan_process")
      .select(`
        id,
        user_id,
        current_step,
        berita_acara,
        approval_status,
        process_status,
        is_completed,
        created_at,
        updated_at,
        user:users (nama)
      `)
      .order("updated_at", { ascending: false });

    // Filter berdasarkan peran: Admin/Pimpinan bisa lihat semua, user biasa hanya lihat miliknya
    if (userRole !== "Admin" && userRole !== "Pimpinan") {
      query = query.eq("user_id", userId);
    }

    if (filterStatus === "completed") {
      query = query.eq("is_completed", true);
    } else if (filterStatus === "pending") {
      query = query.eq("is_completed", false);
    }

    if (searchTerm) {
      // Jika ada nomor BA, cari berdasarkan itu. Jika tidak, bisa tambahkan pencarian lain.
      query = query.ilike('berita_acara->>nomor_berita_acara', `%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Gagal memuat riwayat pemindahan: " + error.message);
    } else {
      // Map the data to ensure the user property matches the interface
      // Supabase join might return user as an array even for single relationships
      const processedData = data?.map((item: any) => {
        // Check if item.user is an array and has elements, take the first one
        // Otherwise, assume it's already the correct object or null
        const user = Array.isArray(item.user) && item.user.length > 0 ? item.user[0] : item.user;

        return {
          id: item.id,
          user_id: item.user_id,
          current_step: item.current_step,
          berita_acara: item.berita_acara,
          approval_status: item.approval_status,
          process_status: item.process_status,
          is_completed: item.is_completed,
          created_at: item.created_at,
          updated_at: item.updated_at,
          user: user ? { nama: user.nama } : null // Ensure user object matches interface { nama: string } or is null
        } as PemindahanProcess; // Cast the mapped item to PemindahanProcess
      }) || [];
      setProcesses(processedData);
    }
    setLoading(false);
  }, [userId, supabase, filterStatus, searchTerm, userRole]);

  useEffect(() => {
    if (!authLoading) {
      fetchProcesses();
    }
  }, [authLoading, fetchProcesses]);

  // Tambahkan fungsi untuk menghapus proses pemindahan
  const handleDeleteProcess = async (processId: string) => {
    if (!window.confirm("Yakin ingin menghapus proses pemindahan ini? Data yang belum selesai akan hilang.")) return;
    setLoading(true);
    const { error } = await supabase
      .from("pemindahan_process")
      .delete()
      .eq("id", processId)
      .eq("is_completed", false); // Pastikan hanya proses yang belum selesai yang bisa dihapus

    if (error) {
      toast.error("Gagal menghapus proses: " + error.message);
    } else {
      toast.success("Proses berhasil dihapus.");
      setProcesses(prev => prev.filter(p => p.id !== processId));
    }
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <RiwayatLoadingSkeleton />
    );
  }

  return (
    <div className="w-full h-full p-6"> {/* Consistent page padding */}
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col"> {/* Content wrapper */}
        <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col"> {/* Main content card */}
          {/* Header inside card */}
          <div className="bg-primary/10 px-6 py-4">
            <h1 className="text-2xl font-bold text-primary ">Riwayat Proses Pemindahan Arsip</h1>
            <p className="text-sm text-muted-foreground mt-1">Daftar proses pemindahan arsip yang telah diajukan.</p>
          </div>

          {/* Search and Filter Section */}
          <div className="p-6 border-b border-border/50 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow w-full md:w-auto">
              <input
                type="text"
                placeholder="Cari No. Berita Acara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-colors duration-300"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
              {(["all", "pending", "completed"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-200
                    ${filterStatus === status ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted-foreground/10"}`}
                >
                  {status === "all" ? "Semua" : status === "pending" ? "Tertunda" : "Selesai"}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6 flex-grow overflow-y-auto"> {/* Scrollable content area */}
            {processes.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 dark:bg-muted/20 border border-border/40 rounded-lg shadow-md flex flex-col items-center justify-center h-full">
                <ListFilter className="mx-auto h-16 w-16 text-primary/70 mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Tidak Ada Riwayat Ditemukan</h3>
                <p className="text-muted-foreground">Tidak ada proses pemindahan arsip yang sesuai dengan filter saat ini.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {processes.map((process) => (
                  <div key={process.id} className="bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                      <h3 className="text-lg font-semibold text-primary mb-1 sm:mb-0 flex items-center gap-2">
                        <FileText size={20} />
                        Pemindahan ({process.berita_acara?.tanggal_berita_acara ? formatDate(process.berita_acara.tanggal_berita_acara) : <span className="italic text-muted-foreground">Tanggal Belum Ada</span>})
                      </h3>
                      <span className={`px-3 py-1.5 text-xs font-medium rounded-full inline-flex items-center
                        ${process.is_completed
                          ? "bg-green-500/10 text-green-500"
                          : "bg-yellow-500/10 text-yellow-500"
                        }`}>
                        {process.is_completed ? <CheckCircle className="inline mr-1 h-4 w-4" /> : <Clock className="inline mr-1 h-4 w-4" />}
                        {process.is_completed ? "Selesai" : "Tertunda"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Tanggal Berita Acara: {formatDate(process.berita_acara?.tanggal_berita_acara || null)}</p>
                    <p className="text-sm text-gray-600">Pengaju: {process.user?.nama || "Tidak diketahui"}</p>
                    <p className="text-sm text-gray-600">Persetujuan Kabid: <span className="font-medium">{process.approval_status?.kepala_bidang?.status || "Menunggu"}</span></p>
                    <p className="text-sm text-gray-600">Persetujuan Sekretaris: <span className="font-medium">{process.approval_status?.sekretaris?.status || "Menunggu"}</span></p>
                    <p className="text-sm text-gray-500 mt-1">Terakhir Diperbarui: {formatDate(process.updated_at)}</p>
                    <div className="mt-4 flex gap-3 flex-wrap">
                      <Link href={`/arsip/pemindahan/detail/${process.id}`} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                        <Eye size={16} /> Lihat Detail
                      </Link>
                      {!process.is_completed && (
                        <>
                          <Link href={`/arsip/pemindahan?process_id=${process.id}`} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                            <PlayCircle size={16} /> Lanjutkan Proses
                          </Link>
                          <button
                            onClick={() => handleDeleteProcess(process.id)}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <Trash2 size={16} /> Hapus
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div> 
      </div> 
    </div> 
  );
}