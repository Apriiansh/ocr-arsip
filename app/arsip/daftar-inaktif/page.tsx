"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, Trash2, Eye, ArchiveRestore, FolderArchive, FileSpreadsheet } from "lucide-react"; // Tambahkan FileSpreadsheet
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { exportArsipInaktifToExcel } from './components/DaftarArsipInaktifExcel'; // Impor fungsi ekspor
import Loading from "./loading";

export interface ArsipInaktifRow {
  id_arsip_inaktif: string;
  nomor_berkas: number;
  kode_klasifikasi: string;
  jenis_arsip: string | null;
  kurun_waktu: string | null;
  tingkat_perkembangan: string | null;
  jumlah: number | null;
  keterangan: string | null;
  nomor_definitif_folder_dan_boks: string | null;
  lokasi_simpan: string | null;
  jangka_simpan: number | null;
  nasib_akhir: string | null;
  kategori_arsip: string | null;
  tanggal_pindah: string | null;
  file_url: string | null;
  status_persetujuan: string | null;
}

export default function DaftarArsipInaktif() {
  const supabase = createClient();
  const router = useRouter();
  const [arsipList, setArsipList] = useState<ArsipInaktifRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const [isReordering, setIsReordering] = useState(false);
  const [isExporting, setIsExporting] = useState(false); // State untuk loading saat export
  // Tidak memerlukan userBidangId karena arsip inaktif tidak difilter per bidang

  const ALLOWED_ROLE = "Pegawai"; // Atau peran lain yang sesuai
  const SIGN_IN_PATH = "/sign-in";
  const DEFAULT_HOME_PATH = "/";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage - 1;

    console.log(`fetchData (daftar-inaktif): Querying page: ${currentPage}, itemsPerPage: ${itemsPerPage}, range: ${startIndex}-${endIndex}`);

    try {
      const { data, error, count } = await supabase
        .from("arsip_inaktif")
        .select(`*`, { count: "exact" }) // Ambil semua kolom dari arsip_inaktif
        .order("nomor_berkas", { ascending: true })
        .range(startIndex, endIndex);

      console.log(`fetchData (daftar-inaktif): Arsip data query result - data:`, data, "count:", count, "error:", error);

      if (error) {
        toast.error("Gagal memuat data arsip inaktif: " + error.message);
        setArsipList([]);
        setTotalPages(0);
      } else {
        setArsipList(data as ArsipInaktifRow[] || []);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      }
    } catch (e: any) {
      console.error("fetchData (daftar-inaktif): Unexpected error during fetch:", e);
      toast.error("Terjadi kesalahan tak terduga saat mengambil data: " + e.message);
      setArsipList([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, supabase]);

  useEffect(() => {
    console.log("useEffect (auth check - inaktif): Running checkAuth...");
    const checkAuth = async () => {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      try {
        if (!session) {
          console.warn("No active session, redirecting to sign-in.");
          router.push(SIGN_IN_PATH);
          return; // authLoading akan diatur di finally
        }
        console.log(`checkAuth (inaktif): Session found.`);

        const userId = session.user.id;
        console.log(`checkAuth (inaktif): Fetching user data for ${userId}`);
        const { data: userData, error: userFetchError } = await supabase
          .from("users")
          .select("role") // Hanya butuh role untuk otorisasi halaman
          .eq("user_id", userId)
          .single();

        console.log(`checkAuth (inaktif): User data fetched for ${userId}. Data:`, userData, "Error:", userFetchError);

        if (userFetchError || !userData || !userData.role) {
          console.error("Error fetching user role or role is null:", userFetchError);
          toast.error("Gagal memverifikasi peran pengguna.");
          router.push(SIGN_IN_PATH);
          return; // authLoading akan diatur di finally
        }

        if (userData.role !== ALLOWED_ROLE) {
          console.warn(`User role "${userData.role}" is not authorized for this page. Redirecting.`);
          toast.warn("Anda tidak memiliki izin untuk mengakses halaman ini. Peran Anda: " + userData.role);
          router.push(DEFAULT_HOME_PATH);
          return; // authLoading akan diatur di finally
        }
        // Jika semua pengecekan lolos, panggil fetchData di sini
        // fetchData(); // Dipindahkan ke useEffect terpisah yang bergantung pada authLoading
      } catch (error: any) {
        console.error("checkAuth (inaktif): Unexpected error fetching user role:", error.message);
        toast.error("Terjadi kesalahan saat verifikasi peran: " + error.message);
        router.push(SIGN_IN_PATH);
        // Tidak perlu return di sini karena finally akan dijalankan
      } finally {
        setAuthLoading(false); // Pastikan authLoading selalu diatur ke false
      }
    };
    checkAuth();
  }, [router, supabase, SIGN_IN_PATH, DEFAULT_HOME_PATH, ALLOWED_ROLE]);

  // useEffect untuk memanggil fetchData ketika currentPage berubah (setelah auth check awal)
   useEffect(() => {
    if (!authLoading) { // Hanya fetch jika auth sudah selesai
        fetchData();
    }
   }, [currentPage, authLoading, fetchData]);


  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const filteredArsip = useMemo(() => {
    return arsipList.filter(
      (arsip) =>
        arsip.kode_klasifikasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (arsip.jenis_arsip && arsip.jenis_arsip.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (arsip.nomor_definitif_folder_dan_boks && arsip.nomor_definitif_folder_dan_boks.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [arsipList, searchTerm]);

  const handleDelete = useCallback(async (idArsip: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus arsip inaktif ini?")) return;
    setLoading(true); // Tampilkan loading saat menghapus
    try {
      const { error } = await supabase
        .from("arsip_inaktif")
        .delete()
        .eq("id_arsip_inaktif", idArsip);

      if (error) {
        toast.error("Gagal menghapus arsip inaktif.");
        console.error("Error deleting data:", error.message || error);
      } else {
        toast.success("Arsip inaktif berhasil dihapus!");
        fetchData(); // Refresh data
      }
    } finally {
      setLoading(false); // Pastikan loading di-set false
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

  const handleExportExcelInaktif = useCallback(async () => {
    if (!filteredArsip.length) {
      toast.warn("Tidak ada data arsip inaktif untuk diekspor.");
      return;
    }
    setIsExporting(true);
    try {
      await exportArsipInaktifToExcel({ data: filteredArsip });
      toast.success("Data arsip inaktif berhasil diekspor ke Excel!");
    } catch (error) {
      toast.error("Gagal mengekspor data arsip inaktif ke Excel.");
      console.error("Export Excel Inaktif error:", error);
    }
    setIsExporting(false);
  }, [filteredArsip]);

  const handleReorderAndSaveNomorBerkasInaktif = async () => {
    const confirmation = window.confirm(
      `Anda akan menata ulang nomor berkas untuk semua arsip inaktif. Arsip akan diurutkan berdasarkan Kode Klasifikasi, kemudian berdasarkan Tanggal Pembuatan (terlama ke terbaru). Ini akan mengubah nomor berkas. Lanjutkan?`   );
    if (!confirmation) return;

    setIsReordering(true);
    toast.info("Memproses penataan ulang nomor berkas arsip inaktif...");

    try {
      // Fetch ALL arsip_inaktif data, sorted as defined
      let allArsipQuery = supabase
        .from("arsip_inaktif")
        .select("id_arsip_inaktif, kode_klasifikasi, tanggal_pindah") // Kolom yang dibutuhkan untuk sorting dan update
        .order('kode_klasifikasi', { ascending: true })
        .order('tanggal_pindah', { ascending: true, nullsFirst: false }) // nullsFirst: false agar null di akhir jika ascending
        .order('id_arsip_inaktif', { ascending: true }); // Tie-breaker

      const { data: allArsip, error: allArsipError } = await allArsipQuery;

      if (allArsipError) {
        throw new Error("Gagal mengambil semua data arsip inaktif untuk penataan ulang: " + allArsipError.message);
      }

      if (!allArsip || allArsip.length === 0) {
        toast.info("Tidak ada arsip inaktif untuk ditata ulang.");
        setIsReordering(false);
        return;
      }

      const updatePromises = allArsip.map((arsip, index) =>
        supabase
          .from("arsip_inaktif")
          .update({ nomor_berkas: index + 1 }) // Nomor berkas baru sekuensial mulai dari 1
          .eq("id_arsip_inaktif", arsip.id_arsip_inaktif)
      );

      await Promise.all(updatePromises);
      toast.success(`Nomor berkas untuk ${allArsip.length} arsip inaktif berhasil ditata ulang dan disimpan!`);
    } catch (error: any) {
      console.error("Error during reorder and save for inactive archives:", error);
      toast.error("Terjadi kesalahan saat menata ulang arsip inaktif: " + error.message);
    } finally {
      setIsReordering(false);
      if (!authLoading) {
        fetchData();
      } else {
        // Jika authLoading masih true, fetchData akan dipanggil oleh useEffect setelah auth selesai.
      }
    }
  };

  if (authLoading || loading) {
    return <Loading />;
  }

  return (
    <div className="w-full h-full p-6">
      <div className="max-w-8xl mx-auto w-full h-full flex flex-col">
        <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
          {/* Header */}
          <div className="bg-primary/10 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 rounded-lg">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-primary">
              <FolderArchive size={24} /> Daftar Arsip Inaktif
            </h2>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
              <button
                onClick={handleExportExcelInaktif}
                disabled={isExporting || loading || authLoading || filteredArsip.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg text-sm font-medium hover:bg-green-600 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet size={18} />
                {isExporting ? "Mengekspor..." : "Export Excel"}
              </button>
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
                placeholder="Cari berdasarkan kode, jenis arsip, atau nomor boks..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-300"
              />
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="px-6 py-3 border-b border-border/50 flex justify-end">
            <button
              onClick={handleReorderAndSaveNomorBerkasInaktif}
              disabled={isReordering || loading || authLoading || arsipList.length === 0}
              className="px-4 py-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 text-sm font-medium"
            >
              {isReordering ? "Menyimpan..." : `Tata Ulang Arsip`}
            </button>
          </div>

          {/* Table Section */}
          <div className="p-6 flex-grow flex flex-col overflow-auto">
            {filteredArsip.length > 0 ? (
              <table className="min-w-full divide-y divide-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted text-muted-foreground">
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">No. Berkas</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Kode Klas.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Jenis Arsip</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Kurun Waktu</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Tingkat Perk.</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">No. Boks/Folder</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Lokasi Simpan</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Jngk. Simpan (Thn)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Nasib Akhir</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Kategori</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Jml</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredArsip.map((arsip) => (
                    <tr key={arsip.id_arsip_inaktif} className="hover:bg-muted transition-colors duration-150">
                      <td className="px-4 py-3 text-sm text-center">{arsip.nomor_berkas}</td>
                      <td className="px-4 py-3 text-sm text-center">{arsip.kode_klasifikasi}</td>
                      <td
                        className="px-4 py-3 text-sm text-left max-w-xs truncate"
                        title={arsip.jenis_arsip || undefined}
                      >
                        {arsip.jenis_arsip ? arsip.jenis_arsip : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-center whitespace-nowrap">{arsip.kurun_waktu || '-'}</td>
                      <td className="px-4 py-3 text-sm text-center">{arsip.tingkat_perkembangan || '-'}</td>
                      <td className="px-4 py-3 text-sm text-center">{arsip.nomor_definitif_folder_dan_boks || '-'}</td>
                      <td className="px-4 py-3 text-sm text-center">{arsip.lokasi_simpan || '-'}</td>
                      <td className="px-4 py-3 text-sm text-center">{arsip.jangka_simpan !== null ? arsip.jangka_simpan : '-'}</td>
                      <td className="px-4 py-3 text-sm text-center">{arsip.nasib_akhir || '-'}</td>
                      <td
                        className="px-4 py-3 text-sm text-center max-w-[100px] truncate"
                        title={arsip.kategori_arsip || undefined}
                      >
                        {arsip.kategori_arsip || '-'}</td>
                      <td className="px-4 py-3 text-sm text-center">{arsip.jumlah || '-'}</td>
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
                        <Link href={`/arsip/arsip-inaktif/detail/${arsip.id_arsip_inaktif}`} passHref>
                          <button className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary group transition-all duration-150 ease-in-out" title="Lihat Detail" aria-label="Lihat Detail Arsip Inaktif">
                            <Eye size={18} className="transform group-hover:scale-110 transition-transform duration-150" />
                          </button>
                        </Link>
                        <button onClick={() => handleDelete(arsip.id_arsip_inaktif)} className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-destructive group ml-2 transition-all duration-150 ease-in-out" title="Hapus Arsip" aria-label="Hapus Arsip Inaktif">
                          <Trash2 size={18} className="transform group-hover:scale-110 transition-transform duration-150" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-16 bg-muted/30 dark:bg-muted/20 rounded-lg flex-grow flex flex-col justify-center items-center">
                <ArchiveRestore size={48} className="mx-auto text-muted-foreground" />
                <p className="mt-2 text-lg text-muted-foreground">Tidak ada arsip inaktif ditemukan.</p>
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