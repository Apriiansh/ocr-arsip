"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, Trash2, Eye, FileText, FolderOpen, Filter, Archive, FileSpreadsheet } from "lucide-react"; // Tambahkan FileSpreadsheet
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { exportArsipAktifToExcel } from '../components/DaftarArsipAktifExcel'; // Path ke komponen baru
// Loading Skeleton Component
const TableLoadingSkeleton = () => {
  return (
    <>
      {/* Header Skeleton (mimicking the one inside card-neon) */}
      <div className="bg-primary/10 px-6 py-4 flex justify-between items-center">
        <div className="h-8 w-48 bg-primary/20 rounded animate-pulse"></div> {/* Skeleton untuk Judul "Daftar Arsip Aktif" */}
        <div className="flex gap-2"> {/* Kontainer untuk skeleton tombol */}
          <div className="h-9 w-32 bg-primary/20 rounded animate-pulse"></div> {/* Skeleton untuk tombol Export Excel */}
          <div className="h-9 w-36 bg-primary/20 rounded animate-pulse"></div> {/* Skeleton untuk tombol Visualisasi Filing */}
        </div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="p-6 border-b border-border/50">
        <div className="h-12 bg-input rounded-lg animate-pulse"></div>
      </div>

      {/* Filter/Action Skeleton */}
      <div className="px-6 py-3 border-b border-border/50 flex justify-between items-center">
        <div className="h-10 w-48 bg-input rounded-lg animate-pulse"></div> {/* For filter select */}
        <div className="h-10 w-32 bg-accent/50 rounded-lg animate-pulse"></div> {/* For reorder button */}
      </div>

      {/* Table Skeleton */}
      <div className="p-6 flex-grow flex flex-col overflow-auto">
        <div className="overflow-x-auto rounded-lg border border-border animate-pulse">
          <div className="h-10 bg-muted/50 w-full rounded-t-lg"></div> {/* Header row */}
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-12 border-t border-border bg-card flex items-center px-3">
              <div className="h-4 bg-muted/30 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex justify-between items-center p-4 border-t border-border/50 mt-auto">
        <div className="h-10 w-28 bg-muted/50 rounded animate-pulse"></div>
        <div className="h-6 w-32 bg-muted/50 rounded animate-pulse"></div>
        <div className="h-10 w-28 bg-muted/50 rounded animate-pulse"></div>
      </div>
    </>
  );
};

interface LokasiPenyimpanan {
  id_bidang_fkey: number;
  no_filing_cabinet?: string | null;
  no_laci: string | null;
  no_folder: string | null;
}

export interface ArsipRow {
  id_arsip_aktif: string;
  nomor_berkas: number;
  kode_klasifikasi: string;
  uraian_informasi: string;
  kurun_waktu: string | null;
  jumlah: number | null;
  keterangan: string | null;
  jangka_simpan: string | null;
  tingkat_perkembangan: string | null;
  media_simpan: string | null;
  file_url: string | null;
  status_persetujuan: string | null;
  lokasi_penyimpanan: LokasiPenyimpanan | LokasiPenyimpanan[] | null;
}

function getLokasiObj(lokasi: ArsipRow["lokasi_penyimpanan"]): LokasiPenyimpanan | null {
  if (!lokasi) return null;
  if (Array.isArray(lokasi)) return lokasi[0] || null;
  return lokasi;
}

export default function DaftarArsipAktif() {
  const supabase = createClient();
  const router = useRouter();
  const [arsipList, setArsipList] = useState<ArsipRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true); // Untuk data fetch
  const [authLoading, setAuthLoading] = useState(true); // Untuk auth check
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10; // Jumlah item per halaman
  const [userBidangId, setUserBidangId] = useState<number | null>(null); // State untuk menyimpan id_bidang pengguna
  const [sortConfig, setSortConfig] = useState<{ key: 'nomor_berkas' | 'kode_klasifikasi'; direction: 'asc' | 'desc' }>({ key: 'nomor_berkas', direction: 'asc' });
  const [isReordering, setIsReordering] = useState(false); // State untuk loading saat reorder
  const [isExporting, setIsExporting] = useState(false); // State untuk loading saat export
  const [statusFilterAktif, setStatusFilterAktif] = useState<string>("Semua"); // "Semua", "Menunggu", "Disetujui", "Ditolak"

  const ALLOWED_ROLE = "Pegawai";
  const SIGN_IN_PATH = "/sign-in";
  const DEFAULT_HOME_PATH = "/"; // Akan di-handle oleh HomeRedirect

  const fetchData = useCallback(async () => {
  if (userBidangId === null) {
    console.log("fetchData (daftar-aktif): userBidangId is null, aborting fetch.");
    setLoading(false);
    setArsipList([]);
    setTotalPages(0);
    return;
  }
  setLoading(true);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage - 1;
  console.log(`fetchData (daftar-aktif): Querying with userBidangId: ${userBidangId}, page: ${currentPage}, itemsPerPage: ${itemsPerPage}, range: ${startIndex}-${endIndex}`);

  try {
    // 1. Fetch IDs from pemindahan_arsip_link to exclude
    const { data: pemindahanLinks, error: pemindahanError } = await supabase
      .from('pemindahan_arsip_link')
      .select('id_arsip_aktif_fkey');

    if (pemindahanError) {
      toast.error("Gagal memuat data link pemindahan: " + pemindahanError.message);
      setArsipList([]);
      setTotalPages(0);
      setLoading(false);
      return;
    }

    const idsToExclude = pemindahanLinks?.map(link => link.id_arsip_aktif_fkey).filter(id => id != null) || [];

    // 2. Fetch arsip_aktif data
    let query = supabase
      .from("arsip_aktif")
      .select(`
        id_arsip_aktif,
        nomor_berkas,
        kode_klasifikasi,
        uraian_informasi,
        kurun_waktu,
        jumlah,
        keterangan,
        jangka_simpan,
        tingkat_perkembangan,
        media_simpan,
        file_url,
        status_persetujuan,
        lokasi_penyimpanan!inner (
          id_bidang_fkey,
          no_filing_cabinet,
          no_laci,
          no_folder
        )
      `, { count: "exact" })
      .eq('lokasi_penyimpanan.id_bidang_fkey', userBidangId); // Filter berdasarkan id_bidang_fkey dari lokasi_penyimpanan

    if (idsToExclude.length > 0) {
      const idsToExcludeString = `(${idsToExclude.join(',')})`;
      query = query.not('id_arsip_aktif', 'in', idsToExcludeString); // Filter arsip yang tidak ada di tabel pemindahan_arsip_link
    }

    // Apply status filter
    if (statusFilterAktif !== "Semua") {
      query = query.eq('status_persetujuan', statusFilterAktif);
    }

    // Apply sorting from sortConfig
    query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

    // Add a secondary sort for stability to ensure consistent ordering
    if (sortConfig.key === 'nomor_berkas') {
      query = query.order('id_arsip_aktif', { ascending: true }); // Secondary sort by ID if primary is nomor_berkas
    } else if (sortConfig.key === 'kode_klasifikasi') {
      // If sorting by kode_klasifikasi, use nomor_berkas as secondary, then id_arsip_aktif
      query = query.order('nomor_berkas', { ascending: true }); 
      query = query.order('id_arsip_aktif', { ascending: true });
    } else {
      query = query.order('id_arsip_aktif', { ascending: true }); // Default secondary sort
    }
    const { data, error, count } = await query
      .range(startIndex, endIndex); // Tambahkan range untuk pagination

    console.log(`fetchData (daftar-aktif): Arsip data query result - data:`, data, "count:", count, "error:", error);

    if (error) {
      toast.error("Gagal memuat data arsip: " + error.message);
      setArsipList([]);
      setTotalPages(0);
    } else {
      setArsipList(data as unknown as ArsipRow[] || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    }
  } catch (e: any) {
    console.error("fetchData (daftar-aktif): Unexpected error during fetch:", e);
    toast.error("Terjadi kesalahan tak terduga saat mengambil data: " + e.message);
    setArsipList([]);
    setTotalPages(0);
  }
  setLoading(false);
}, [currentPage, itemsPerPage, supabase, userBidangId, sortConfig, statusFilterAktif]);

  useEffect(() => {
    console.log("useEffect (auth check): Running checkAuth...");
    const checkAuth = async () => {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.warn("No active session, redirecting to sign-in.");
        router.push(SIGN_IN_PATH);
        setAuthLoading(false);
        return;
      }
      console.log(`checkAuth: Session found.`);

      // Jika ada sesi, periksa peran pengguna
      const userId = session.user.id;
      let userRole: string | null = null;

      try {
        console.log(`checkAuth: Fetching user data for ${userId}`);
        const { data: userData, error: userFetchError } = await supabase
          .from("users") // Pastikan nama tabel ini ('users') sesuai dengan database Anda
          .select("role, id_bidang_fkey") // Ambil juga id_bidang_fkey
          .eq("user_id", userId) // Pastikan nama kolom ini ('user_id') sesuai
          .single();
        
        console.log(`checkAuth: User data fetched for ${userId}. Data:`, userData, "Error:", userFetchError);

        if (userFetchError) {
          console.error("Error fetching user role:", userFetchError);
          toast.error("Gagal memverifikasi peran pengguna: " + userFetchError.message);
          setUserBidangId(null);
          setAuthLoading(false);
          router.push(SIGN_IN_PATH);
          return;
        }

        if (!userData || !userData.role || userData.id_bidang_fkey === null) {
          console.warn(`checkAuth: Data pengguna (peran/bidang) tidak lengkap untuk userId: ${userId}. Redirecting.`, userData);
          toast.warn("Data pengguna (peran/bidang) tidak lengkap. Silakan login kembali.");
          setUserBidangId(null);
          setAuthLoading(false);
          router.push(SIGN_IN_PATH); // Arahkan ke sign-in jika data user tidak lengkap
          return;
        }
        userRole = userData.role;
        setUserBidangId(userData.id_bidang_fkey); // Simpan id_bidang_fkey pengguna

        if (userData.id_bidang_fkey === null) {
            console.warn(`checkAuth: User ${userId} has role ${userData.role} but id_bidang_fkey is null.`);
            toast.error("ID Bidang pengguna tidak ditemukan. Tidak dapat memfilter arsip.");
            // userBidangId akan null, fetchData tidak akan fetch
        }
      } catch (error: any) {
        console.error("checkAuth: Unexpected error fetching user role:", error.message);
        toast.error("Terjadi kesalahan saat verifikasi peran: " + error.message);
        setUserBidangId(null);
        setAuthLoading(false);
        router.push(SIGN_IN_PATH);
        return;
      }

      if (userRole !== ALLOWED_ROLE) {
        console.warn(`User role "${userRole}" is not authorized for this page. Redirecting.`);
        toast.warn("Anda tidak memiliki izin untuk mengakses halaman ini. Peran Anda: " + userRole);
        setUserBidangId(null);
        setAuthLoading(false);
        router.push(DEFAULT_HOME_PATH); // HomeRedirect akan mengarahkan sesuai peran
        return;
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, [router, supabase, SIGN_IN_PATH, DEFAULT_HOME_PATH, ALLOWED_ROLE]);

  useEffect(() => {
    if (userBidangId !== null) { // Hanya panggil fetchData jika userBidangId sudah terisi
      console.log(`useEffect (fetchData trigger): userBidangId is ${userBidangId}, calling fetchData.`);
      fetchData(); // fetchData akan menggunakan sortConfig dari state
    } else {
      console.log("useEffect (fetchData trigger): userBidangId is null, skipping fetchData.");
    }
  }, [userBidangId, currentPage, fetchData, sortConfig, statusFilterAktif]); 
  
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);
  const filteredArsip = useMemo(() => {
    return arsipList.filter(
      (arsip) =>
        arsip.kode_klasifikasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arsip.uraian_informasi.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [arsipList, searchTerm]);

  const handleDelete = useCallback(async (idArsip: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus arsip ini?")) return;
    setLoading(true); // Tampilkan loading saat menghapus

    const { error } = await supabase
      .from("arsip_aktif")
      .delete()
      .eq("id_arsip_aktif", idArsip);

    if (error) {
      toast.error("Gagal menghapus arsip.");
      console.error("Error deleting data:", error.message || error);
      setLoading(false);
    } else {
      toast.success("Arsip berhasil dihapus!");
      fetchData(); // Panggil ulang fetchData untuk refresh data dan paginasi
    }
  }, [supabase, fetchData]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSortRequest = (key: 'nomor_berkas' | 'kode_klasifikasi') => {
    setSortConfig(currentSortConfig => {
      if (currentSortConfig.key === key) {
        // Toggle direction if same key
        return { key, direction: currentSortConfig.direction === 'asc' ? 'desc' : 'asc' };
      }
      // New key, default to ascending
      return { key, direction: 'asc' };
    });
    setCurrentPage(1); // Reset ke halaman pertama saat sorting berubah
  };

  const handleExportExcel = useCallback(async () => {
    if (!filteredArsip.length) {
      toast.warn("Tidak ada data arsip untuk diekspor.");
      return;
    }
    setIsExporting(true);
    try {
      await exportArsipAktifToExcel({ data: filteredArsip, userBidangId });
      toast.success("Data arsip berhasil diekspor ke Excel!");
    } catch (error) {
      toast.error("Gagal mengekspor data ke Excel.");
      console.error("Export Excel error:", error);
    }
    setIsExporting(false);
  }, [filteredArsip, userBidangId]);

  const getSortIndicator = (key: 'nomor_berkas' | 'kode_klasifikasi') => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? '↑' : '↓';
    }
    return <span className="opacity-0 group-hover:opacity-50 transition-opacity">↕</span>;
  };
  
  const handleReorderAndSaveNomorBerkas = async () => {
    if (!userBidangId) {
      toast.error("ID Bidang pengguna tidak ditemukan.");
      return;
    }
  
    const confirmation = window.confirm(
      `Anda akan menata ulang nomor berkas untuk semua arsip aktif di bidang Anda. Arsip akan diurutkan berdasarkan Kode Klasifikasi (urut abjad), lalu nomor laci (1-4), lalu nomor folder (urut kode klasifikasi), lalu tanggal pembuatan (terlama ke terbaru). Ini akan mengubah nomor berkas. Lanjutkan?`
    );
  
    if (!confirmation) return;
  
    setIsReordering(true);
    toast.info("Memproses penataan ulang nomor berkas...");
  
    try {
      // 1. Fetch IDs from pemindahan_arsip_link to exclude
      const { data: pemindahanLinks, error: pemindahanError } = await supabase
        .from('pemindahan_arsip_link')
        .select('id_arsip_aktif_fkey');
  
      if (pemindahanError) {
        throw new Error("Gagal memuat data link pemindahan: " + pemindahanError.message);
      }
      const idsToExclude = pemindahanLinks?.map(link => link.id_arsip_aktif_fkey).filter(id => id != null) || [];
  
      // 2. Fetch ALL arsip_aktif data for the current user's bidang, excluding moved ones
      let allArsipQuery = supabase
        .from("arsip_aktif")
        .select(`
          id_arsip_aktif,
          kode_klasifikasi,
          created_at,
          lokasi_penyimpanan!inner(
            id_bidang_fkey,
            no_laci,
            no_folder
          )
        `)
        .eq('lokasi_penyimpanan.id_bidang_fkey', userBidangId);
  
      if (idsToExclude.length > 0) {
        const idsToExcludeString = `(${idsToExclude.join(',')})`;
        allArsipQuery = allArsipQuery.not('id_arsip_aktif', 'in', idsToExcludeString);
      }
  
      const { data: allArsip, error: allArsipError } = await allArsipQuery;
  
      if (allArsipError) {
        throw new Error("Gagal mengambil semua data arsip untuk penataan ulang: " + allArsipError.message);
      }
  
      if (!allArsip || allArsip.length === 0) {
        toast.info("Tidak ada arsip untuk ditata ulang.");
        setIsReordering(false);
        return;
      }
  
      const sortedArsip = [...allArsip].sort((a, b) => {
        // Kode klasifikasi abjad
        const kodeCompare = (a.kode_klasifikasi || '').localeCompare(b.kode_klasifikasi || '');
        if (kodeCompare !== 0) return kodeCompare;
      
        // Laci urut angka
        const lokasiA = getLokasiObj(a.lokasi_penyimpanan);
        const lokasiB = getLokasiObj(b.lokasi_penyimpanan);
        const laciA = parseInt(lokasiA?.no_laci || "1", 10);
        const laciB = parseInt(lokasiB?.no_laci || "1", 10);
        if (laciA !== laciB) return laciA - laciB;
      
        // Folder urut angka
        const folderA = parseInt(lokasiA?.no_folder || "1", 10);
        const folderB = parseInt(lokasiB?.no_folder || "1", 10);
        if (folderA !== folderB) return folderA - folderB;
      
        // created_at urut lama ke baru
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        if (dateA !== dateB) return dateA - dateB;
      
        // id_arsip_aktif sebagai tie-breaker
        return (a.id_arsip_aktif || '').localeCompare(b.id_arsip_aktif || '');
      });
  
      // Update nomor_berkas secara berurutan
      const updatePromises = sortedArsip.map((arsip, index) =>
        supabase
          .from("arsip_aktif")
          .update({ nomor_berkas: index + 1 }) // Nomor berkas baru sekuensial mulai dari 1
          .eq("id_arsip_aktif", arsip.id_arsip_aktif)
      );
  
      await Promise.all(updatePromises);
      toast.success(`Nomor berkas untuk ${sortedArsip.length} arsip berhasil ditata ulang dan disimpan!`);
    } catch (error: any) {
      console.error("Error during reorder and save:", error);
      toast.error("Terjadi kesalahan saat menata ulang: " + error.message);
    } finally {
      setIsReordering(false);
      fetchData(); // Refresh data pada halaman saat ini
    }
  };
  
  // Tampilkan skeleton jika authLoading atau loading (untuk data tabel) true
  if (authLoading || loading) {
    // Wrapper untuk skeleton agar konsisten dengan halaman lain
    return (
        <div className="w-full h-full p-6">
            <div className="max-w-10xl mx-auto w-full h-full flex flex-col">
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                    <TableLoadingSkeleton />
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="w-full h-full p-6"> 
      <div className="max-w-10xl mx-auto w-full h-full flex flex-col">
        <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col"> {/* Main content card */}
        {/* Header */}
        <div className="bg-primary/10 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 rounded-lg">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen size={24} /> Daftar Arsip Aktif
          </h2>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
            <button
              onClick={handleExportExcel}
              disabled={isExporting || loading || authLoading || filteredArsip.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg text-sm font-medium hover:bg-green-600 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={18} />
              {isExporting ? "Mengekspor..." : "Export Excel"}
            </button>
            <Link 
              href="/arsip/visual-filing-cabinet" 
              className="inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/10 transition-colors duration-200"
            >
              <Archive size={18} />
              Visualisasi Filing
            </Link>
          </div>
        </div>

        {/* Search Section */}
        <div className="p-6 border-b border-border/50">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search size={20} className="text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Cari berdasarkan kode klasifikasi atau uraian informasi..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-300"
            />
          </div>
        </div>
        
        {/* Action Buttons Section */}
        <div className="px-6 py-3 border-b border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative min-w-[180px] w-full md:w-auto">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <select
                    value={statusFilterAktif}
                    onChange={(e) => {
                        setStatusFilterAktif(e.target.value);
                        setCurrentPage(1); // Reset ke halaman pertama saat filter berubah
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm transition-colors duration-300"
                >
                    <option value="Semua">Semua Status</option>
                    <option value="Menunggu">Menunggu Persetujuan</option>
                    <option value="Disetujui">Disetujui</option>
                    <option value="Ditolak">Ditolak</option>
                </select>
            </div>
            <button
                onClick={handleReorderAndSaveNomorBerkas}
                disabled={isReordering || loading || authLoading || arsipList.length === 0}
                className="px-4 py-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 text-sm font-medium"
            >
                {isReordering ? "Menyimpan..." : `Tata Ulang`}
            </button>
        </div>

        {/* Table Section */}
        <div className="p-6 flex-grow flex flex-col overflow-auto">
          {filteredArsip.length > 0 ? (
            <table className="min-w-full divide-y divide-border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10 group"
                    onClick={() => handleSortRequest('nomor_berkas')}
                  >
                    No. Berkas <span className="ml-1">{getSortIndicator('nomor_berkas')}</span>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10 group"
                    onClick={() => handleSortRequest('kode_klasifikasi')}
                  >
                    Kode <span className="ml-1">{getSortIndicator('kode_klasifikasi')}</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Uraian Informasi</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Kurun Waktu</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Jumlah</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Tingkat</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Media</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Lokasi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Jangka Simpan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Keterangan</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredArsip.map((arsip) => (
                  <tr key={arsip.id_arsip_aktif} className="hover:bg-muted transition-colors duration-150">
                    <td className="px-4 py-3 text-sm text-center">{arsip.nomor_berkas}</td>
                    <td className="px-4 py-3 text-sm text-center">{arsip.kode_klasifikasi}</td>
                    <td className="px-4 py-3 text-sm text-left max-w-xs truncate" title={arsip.uraian_informasi}>{arsip.uraian_informasi}</td>
                    <td className="px-4 py-3 text-sm text-center">{arsip.kurun_waktu || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">{arsip.jumlah || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">{arsip.tingkat_perkembangan || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">{arsip.media_simpan || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      {(() => {
                        const lokasi = getLokasiObj(arsip.lokasi_penyimpanan);
                        return lokasi
                          ? `${lokasi.no_filing_cabinet || '-'} / ${lokasi.no_laci || '-'} / ${lokasi.no_folder || '-'}`
                          : '- / - / -';
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-left max-w-xs truncate" title={arsip.jangka_simpan || undefined}>{arsip.jangka_simpan || '-'}</td>
                    <td className="px-4 py-3 text-sm text-left max-w-xs truncate" title={arsip.keterangan || undefined}>{arsip.keterangan || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${arsip.status_persetujuan === "Disetujui"
                            ? "bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-400"
                            : arsip.status_persetujuan === "Ditolak"
                              ? "bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-400"
                              : arsip.status_persetujuan === "Menunggu"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/20 dark:text-yellow-400"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-700/20 dark:text-gray-400"
                          }`}
                      >
                        {arsip.status_persetujuan || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                        <Link href={`/arsip/arsip-aktif/detail/${arsip.id_arsip_aktif}`} passHref>
                            <button
                                className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary group transition-all duration-150 ease-in-out"
                                title="Lihat Detail"
                                aria-label="Lihat Detail Arsip"
                            >
                                <Eye size={18} className="transform group-hover:scale-110 transition-transform duration-150" />
                            </button>
                        </Link>
                        <button
                            onClick={() => handleDelete(arsip.id_arsip_aktif)}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-destructive group ml-2 transition-all duration-150 ease-in-out"
                            title="Hapus Arsip"
                            aria-label="Hapus Arsip"
                        >
                            <Trash2 size={18} className="transform group-hover:scale-110 transition-transform duration-150" />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16 bg-muted/50 rounded-lg flex-grow flex flex-col justify-center items-center">
                <FileText size={48} className="mx-auto text-muted-foreground" />
                <p className="mt-2 text-lg text-muted-foreground">Tidak ada arsip ditemukan.</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-border/50 mt-auto">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1 || loading}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              Sebelumnya
            </button>
            <span className="text-sm text-muted-foreground">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || loading}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Selanjutnya
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
  
}
