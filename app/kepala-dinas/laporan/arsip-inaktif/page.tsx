"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, FileText, BarChartBig, ArrowDown, ArrowUp, ChevronsUpDown, Archive, FileSpreadsheet } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { exportLaporanArsipInaktifKepalaDinasToExcel } from './components/LaporanArsipInaktifKepalaDinasExcel';

export interface ArsipInaktifLaporanRow {
  id_arsip_inaktif: string;
  nomor_berkas: number;
  kode_klasifikasi: string;
  jenis_arsip: string | null;
  kurun_waktu: string | null;
  tingkat_perkembangan: string | null;
  jumlah: number | null;
  nomor_definitif_folder_dan_boks: string | null;
  lokasi_simpan: string | null;
  jangka_simpan: number | null;
  nasib_akhir: string | null;
  kategori_arsip: string | null;
  tanggal_pindah: string | null; // Date as string
  status_persetujuan: string | null; // Will always be 'Disetujui'
  users?: { // Relasi ke tabel users
    daftar_bidang?: { // Relasi dari users ke daftar_bidang
      nama_bidang: string;
    } | null;
  } | null; 
  keterangan?: string | null; // Tambahkan keterangan
}

export default function LaporanArsipInaktifKepalaDinas() {
  const supabase = createClient();
  const router = useRouter();

  const [arsipList, setArsipList] = useState<ArsipInaktifLaporanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalArsipInaktifDisetujui, setTotalArsipInaktifDisetujui] = useState(0);
  const [sortColumn, setSortColumn] = useState<string>('nomor_berkas'); // Default sort by nomor_berkas
  const [isExporting, setIsExporting] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // Default sort direction ascending for nomor_berkas
  const itemsPerPage = 10;

  // Tambahkan state untuk semester dan tahun
  const [selectedSemester, setSelectedSemester] = useState<'jan-jun' | 'jul-des'>('jan-jun');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const ALLOWED_ROLE = "Kepala_Dinas";
  const SIGN_IN_PATH = "/sign-in";
  const DEFAULT_HOME_PATH = "/";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage - 1;

    try {
      let query = supabase
        .from("arsip_inaktif")
        .select(`
          id_arsip_inaktif,
          nomor_berkas,
          kode_klasifikasi,
          jenis_arsip,
          kurun_waktu,
          tingkat_perkembangan,
          jumlah,
          nomor_definitif_folder_dan_boks,
          lokasi_simpan,
          jangka_simpan,
          nasib_akhir,
          kategori_arsip,
          tanggal_pindah,
          status_persetujuan,
          users ( ${/* Mengambil id_bidang_fkey untuk debug jika perlu */''}
            daftar_bidang ( nama_bidang )
          ),
          keterangan 
        `, { count: "exact" })
        .eq("status_persetujuan", "Disetujui"); // Filter by status
      
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });

      const { data, error, count } = await query.range(startIndex, endIndex);

      if (error) {
        toast.error("Gagal memuat data laporan arsip inaktif: " + error.message);
        setArsipList([]);
        setTotalPages(0);
        setTotalArsipInaktifDisetujui(0);
      } else {
        setArsipList(data as ArsipInaktifLaporanRow[] || []);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
        setTotalArsipInaktifDisetujui(count || 0);
      }
    } catch (e: any) {
      toast.error("Terjadi kesalahan tak terduga: " + e.message);
      setArsipList([]);
      setTotalPages(0);
      setTotalArsipInaktifDisetujui(0);
    }
    setLoading(false);
  }, [currentPage, itemsPerPage, supabase, sortColumn, sortDirection]);

  useEffect(() => {
    const checkAuth = async () => {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(SIGN_IN_PATH);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (userError || !userData || userData.role !== ALLOWED_ROLE) {
        toast.warn("Akses ditolak atau sesi tidak valid.");
        router.push(userError || !userData ? SIGN_IN_PATH : DEFAULT_HOME_PATH);
        return;
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, [router, supabase]);

  useEffect(() => {
    if (!authLoading) { 
      fetchData();
    }
  }, [authLoading, currentPage, sortColumn, sortDirection, fetchData]);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnName);
      setSortDirection('asc'); 
    }
    setCurrentPage(1); 
  };

  const fetchAllArsipInaktifForExport = async (periode: { startDate: string, endDate: string }): Promise<ArsipInaktifLaporanRow[]> => {
    try {
      console.log(`Fetching all approved inactive archives for export for period: ${periode.startDate} to ${periode.endDate}`);
      
      const query = supabase
        .from("arsip_inaktif")
        .select(`
          id_arsip_inaktif, nomor_berkas, kode_klasifikasi, jenis_arsip,
          kurun_waktu, tingkat_perkembangan, jumlah, nomor_definitif_folder_dan_boks,
          lokasi_simpan, jangka_simpan, nasib_akhir, kategori_arsip, 
          users ( ${/* Mengambil id_bidang_fkey untuk debug jika perlu */''}
            daftar_bidang ( nama_bidang )
          ),
          tanggal_pindah, status_persetujuan, keterangan
        `)
        .eq("status_persetujuan", "Disetujui")
        .gte('tanggal_pindah', periode.startDate)
        .lte('tanggal_pindah', periode.endDate)
        .order('tanggal_pindah', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Database error fetching all inactive archives for export:", error);
        toast.error("Gagal memuat data arsip inaktif untuk ekspor: " + error.message);
        return [];
      }

      console.log(`Successfully fetched ${data?.length || 0} inactive records for export`);
      return (data as ArsipInaktifLaporanRow[]) || [];

    } catch (error: any) {
      console.error("Fetch all inactive archives for export error:", error);
      toast.error("Terjadi kesalahan saat mengambil data arsip inaktif untuk ekspor: " + error.message);
      return [];
    }
  };

  const handleExportExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      let startDate: Date;
      let endDate: Date;
      let periodeString: string;
      if (selectedSemester === 'jan-jun') {
        startDate = new Date(selectedYear, 0, 1);
        endDate = new Date(selectedYear, 5, 30, 23, 59, 59, 999);
        periodeString = `Januari - Juni ${selectedYear}`;
      } else {
        startDate = new Date(selectedYear, 6, 1);
        endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        periodeString = `Juli - Desember ${selectedYear}`;
      }

      const allArsipInaktifForExport = await fetchAllArsipInaktifForExport({
        startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD
        endDate: endDate.toISOString().split('T')[0]      // YYYY-MM-DD
      });

      if (allArsipInaktifForExport.length === 0) {
        toast.info("Tidak ada data arsip inaktif yang disetujui untuk diekspor dalam periode ini.");
        return;
      }

      toast.info(`Memproses ${allArsipInaktifForExport.length} arsip inaktif untuk diekspor (Periode: ${periodeString}). Mohon tunggu...`);
      await exportLaporanArsipInaktifKepalaDinasToExcel({ data: allArsipInaktifForExport, periodeLaporan: periodeString });
      toast.success("Laporan arsip inaktif berhasil diekspor ke Excel!");

    } catch (error: any) {
      console.error("Export Inactive Excel error (Kepala Dinas):", error);
      toast.error(`Gagal mengekspor laporan arsip inaktif: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [supabase, selectedSemester, selectedYear]);

  if (authLoading || loading) {
    return null;
  }

  // Calculate periodeString for display on the button
  let displayPeriodeString: string;
  if (selectedSemester === 'jan-jun') {
    displayPeriodeString = `Januari - Juni ${selectedYear}`;
  } else {
    displayPeriodeString = `Juli - Desember ${selectedYear}`;
  }

  // Generate daftar tahun (misal 2015 hingga tahun sekarang)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 2014 }, (_, i) => 2015 + i);

  // Handler untuk dropdown semester dan tahun
  const handleSemesterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSemester(e.target.value as 'jan-jun' | 'jul-des');
  };
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value));
  };

  return (
    <div className="w-full h-full p-6"> {/* Consistent page padding */}
      <div className="max-w-8xl mx-auto w-full h-full flex flex-col"> {/* Content wrapper */}
        <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col"> {/* Main content card */}
          <div className="bg-primary/10 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-primary">
              <Archive size={24} /> Laporan Arsip Inaktif (Telah Diverifikasi Sekretaris)
            </h2>

            {/* Tambahkan dropdown semester dan tahun di UI sebelum tombol export */}
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <select
                value={selectedSemester}
                onChange={handleSemesterChange}
                className="px-3 py-2 border rounded-lg text-sm bg-input text-foreground"
                style={{ minWidth: 160 }}
              >
                <option value="jan-jun">Januari - Juni</option>
                <option value="jul-des">Juli - Desember</option>
              </select>
              <select
                value={selectedYear}
                onChange={handleYearChange}
                className="px-3 py-2 border rounded-lg text-sm bg-input text-foreground"
                style={{ minWidth: 120 }}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button
                onClick={handleExportExcel}
                disabled={isExporting || loading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg text-sm font-medium hover:bg-green-600 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet size={18} />
                {isExporting ? "Mengekspor..." : `Export Laporan Excel (${displayPeriodeString})`}
              </button>
            </div>
          </div>

        <div className="p-6 border-b border-border/50 space-y-4"> {/* Adjusted border */}
            {/* Themed stats card */}
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20"> 
                <h3 className="text-lg font-semibold text-foreground">Total Arsip Inaktif Disetujui</h3>
                <p className="text-3xl font-bold text-primary">{totalArsipInaktifDisetujui}</p>
                <p className="text-sm text-muted-foreground">Jumlah arsip inaktif yang telah disetujui oleh Sekretaris.</p>
            </div>
        </div>

        <div className="p-6 flex-grow flex flex-col overflow-auto"> {/* Table area takes remaining space */}
          {arsipList.length > 0 ? (
            <table className="min-w-full divide-y divide-border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th 
                    className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10"
                    onClick={() => handleSort('nomor_berkas')}
                  >
                    No. Berkas
                    {sortColumn === 'nomor_berkas' && (sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />)}
                    {sortColumn !== 'nomor_berkas' && <ChevronsUpDown size={12} className="inline ml-1 opacity-30" />}
                  </th>
                  <th 
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10"
                    onClick={() => handleSort('kode_klasifikasi')}
                  >
                    Kode Klas.
                    {sortColumn === 'kode_klasifikasi' && (sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />)}
                    {sortColumn !== 'kode_klasifikasi' && <ChevronsUpDown size={12} className="inline ml-1 opacity-30" />}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Jenis Arsip</th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Kurun Waktu</th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Tingkat Perk.</th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">No. Boks/Folder</th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Lokasi Simpan</th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Jngk. Simpan (Thn)</th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Nasib Akhir</th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Kategori</th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Jml</th>
                  <th 
                    className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10"
                    onClick={() => handleSort('tanggal_pindah')}
                  >
                    Tgl. Pindah
                    {sortColumn === 'tanggal_pindah' && (sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />)}
                    {sortColumn !== 'tanggal_pindah' && <ChevronsUpDown size={12} className="inline ml-1 opacity-30" />}
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {arsipList.map((arsip) => (
                  <tr key={arsip.id_arsip_inaktif} className="hover:bg-muted transition-colors duration-150">
                    <td className="px-3 py-3 text-sm text-center">{arsip.nomor_berkas}</td>
                    <td className="px-3 py-3 text-sm text-left">{arsip.kode_klasifikasi}</td>
                    <td className="px-3 py-3 text-sm text-left max-w-xs truncate" title={arsip.jenis_arsip || undefined}>{arsip.jenis_arsip || '-'}</td>
                    <td className="px-3 py-3 text-sm text-center whitespace-nowrap">{arsip.kurun_waktu || '-'}</td>
                    <td className="px-3 py-3 text-sm text-center">{arsip.tingkat_perkembangan || '-'}</td>
                    <td className="px-3 py-3 text-sm text-center">{arsip.nomor_definitif_folder_dan_boks || '-'}</td>
                    <td className="px-3 py-3 text-sm text-center">{arsip.lokasi_simpan || '-'}</td>
                    <td className="px-3 py-3 text-sm text-center">{arsip.jangka_simpan !== null ? arsip.jangka_simpan : '-'}</td>
                    <td className="px-3 py-3 text-sm text-center">{arsip.nasib_akhir || '-'}</td>
                    <td className="px-3 py-3 text-sm text-center max-w-[100px] truncate" title={arsip.kategori_arsip || undefined}>{arsip.kategori_arsip || '-'}</td>
                    <td className="px-3 py-3 text-sm text-center">{arsip.jumlah || '-'}</td>
                    <td className="px-3 py-3 text-sm text-center whitespace-nowrap">
                        {arsip.tanggal_pindah ? new Date(arsip.tanggal_pindah).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-center whitespace-nowrap">
                      <Link href={`/arsip/arsip-inaktif/detail/${arsip.id_arsip_inaktif}`} passHref>
                        <button
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary group transition-all duration-150 ease-in-out"
                          title="Lihat Detail"
                          aria-label="Lihat Detail Arsip Inaktif"
                        >
                          <Eye size={18} className="transform group-hover:scale-110 transition-transform duration-150" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16 bg-muted/50 rounded-lg flex-grow flex flex-col justify-center items-center"> {/* Adjusted for flex-grow */}
              <FileText size={48} className="mx-auto text-muted-foreground" />
              <p className="mt-2 text-lg text-muted-foreground">
                Tidak ada arsip inaktif yang disetujui ditemukan.
              </p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-border/50 mt-auto"> {/* Added mt-auto and adjusted border */}
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