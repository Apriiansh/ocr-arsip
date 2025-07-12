"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, FileText, Filter, BarChartBig, ArrowDown, ArrowUp, ChevronsUpDown, FileSpreadsheet } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { exportLaporanArsipAktifKepalaDinasToExcel } from './components/LaporanArsipAktifKepalaDinasExcel'; // Import fungsi baru

interface DaftarBidang {
  id_bidang: number;
  nama_bidang: string;
}

export interface ArsipAktifLaporanRow {
  id_arsip_aktif: string;
  nomor_berkas: number;
  kode_klasifikasi: string;
  uraian_informasi: string;
  kurun_waktu: string | null;
  jumlah: number | null;
  tingkat_perkembangan: string | null;
  media_simpan: string | null;
  jangka_simpan: string | null; // Tambahkan jangka_simpan
  created_at: string;
  lokasi_penyimpanan: {
    no_filing_cabinet: string | null;
    no_laci: string | null;
    no_folder: string | null;
    daftar_bidang: {
      nama_bidang: string;
      id_bidang?: number; // Tambahkan id_bidang di sini
    } | null;
  } | null;
}

export default function LaporanArsipAktifKepalaDinas() {
  const supabase = createClient();
  const router = useRouter();

  const [arsipList, setArsipList] = useState<ArsipAktifLaporanRow[]>([]);
  const [daftarBidang, setDaftarBidang] = useState<DaftarBidang[]>([]);
  const [selectedBidangId, setSelectedBidangId] = useState<string>(""); // string to accommodate "" for all

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalArsipDiberkaskan, setTotalArsipDiberkaskan] = useState(0);
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

  // Generate daftar tahun (misal 2015 hingga tahun sekarang)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 2014 }, (_, i) => 2015 + i);

  const fetchBidangList = useCallback(async () => {
    const { data, error } = await supabase
      .from("daftar_bidang")
      .select("id_bidang, nama_bidang")
      .order("nama_bidang", { ascending: true });
    if (error) {
      toast.error("Gagal memuat daftar bidang: " + error.message);
      setDaftarBidang([]);
    } else {
      setDaftarBidang(data || []);
    }
  }, [supabase]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage - 1;

    try {
      // 1. Fetch IDs from pemindahan_arsip_link to exclude
      // This ensures we only show truly active archives not yet in the transfer process
      const { data: pemindahanLinks, error: pemindahanError } = await supabase
        .from('pemindahan_arsip_link')
        .select('id_arsip_aktif_fkey');

      if (pemindahanError) {
        toast.error("Gagal memuat data link pemindahan: " + pemindahanError.message);
        // Decide if you want to proceed with partial data or stop
        // For now, we'll log and continue, potentially showing archives that *should* be excluded
        console.error("Error fetching pemindahan_arsip_link:", pemindahanError.message);
      }
      const idsToExclude = pemindahanLinks
        ?.map(link => link.id_arsip_aktif_fkey)
        .filter(id => id != null) || [];

      let query = supabase
        .from("arsip_aktif")
        .select(`
          id_arsip_aktif,
          nomor_berkas,
          kode_klasifikasi,
          uraian_informasi,
          kurun_waktu,
          jumlah,
          tingkat_perkembangan,
          media_simpan,
          jangka_simpan,
          created_at,
          status_persetujuan,
          lokasi_penyimpanan!inner (
            id_lokasi,
            no_filing_cabinet,
            no_laci,
            no_folder,
            id_bidang_fkey, 
            daftar_bidang!inner (
              id_bidang,
              nama_bidang
            )
          )
        `, { count: "exact" })
        .eq("status_persetujuan", "Disetujui");

      // Exclude 'Sekretariat'
      query = query.not('lokasi_penyimpanan.daftar_bidang.nama_bidang', 'eq', 'Sekretariat');

      if (selectedBidangId && selectedBidangId !== "") {
        query = query.eq('lokasi_penyimpanan.id_bidang_fkey', parseInt(selectedBidangId));
      }

      if (idsToExclude.length > 0) {
        const idsToExcludeString = `(${idsToExclude.join(',')})`;
        query = query.not('id_arsip_aktif', 'in', idsToExcludeString);
      }

      if (sortColumn === 'nama_bidang') {
        // Sorting by a column in a foreign table
        query = query.order('nama_bidang', { foreignTable: 'lokasi_penyimpanan.daftar_bidang', ascending: sortDirection === 'asc' });
      } else {
        query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
      }

      const { data, error, count } = await query.range(startIndex, endIndex);

      if (error) {
        toast.error("Gagal memuat data laporan arsip aktif: " + error.message);
        setArsipList([]);
        setTotalPages(0);
        setTotalArsipDiberkaskan(0);
      } else {
        setArsipList(data as unknown as ArsipAktifLaporanRow[] || []);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
        setTotalArsipDiberkaskan(count || 0);
      }
    } catch (e: any) {
      toast.error("Terjadi kesalahan tak terduga: " + e.message);
      setArsipList([]);
      setTotalPages(0);
      setTotalArsipDiberkaskan(0);
    }
    setLoading(false);
  }, [currentPage, itemsPerPage, supabase, selectedBidangId, sortColumn, sortDirection]);

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
      await fetchBidangList(); // Fetch bidang list after successful auth
    };
    checkAuth();
  }, [router, supabase, fetchBidangList]);

  useEffect(() => {
    if (!authLoading) { // Only fetch data if auth check is complete
      fetchData();
    }
  }, [authLoading, currentPage, selectedBidangId, sortColumn, sortDirection, fetchData]);

  const handleBidangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBidangId(e.target.value);
    setCurrentPage(1); // Reset to first page on filter change
  };

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
      setSortDirection('asc'); // Default to ascending when changing column
    }
    setCurrentPage(1); // Reset to first page on sort change
  };

  // Handler untuk dropdown semester dan tahun
  const handleSemesterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSemester(e.target.value as 'jan-jun' | 'jul-des');
  };
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value));
  };

  // Optimasi fungsi fetchAllArsipForExport
  const fetchAllArsipForExport = async (periode?: { startDate: string, endDate: string }): Promise<ArsipAktifLaporanRow[]> => {
    try {
      console.log('Fetching exclusion IDs...');

      // 1. Fetch exclusion IDs dengan timeout
      const pemindahanPromise = supabase
        .from('pemindahan_arsip_link')
        .select('id_arsip_aktif_fkey');

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout fetching pemindahan links')), 10000)
      );

      const { data: pemindahanLinks, error: pemindahanError } = await Promise.race([
        pemindahanPromise,
        timeoutPromise
      ]) as any;

      if (pemindahanError) {
        console.error("Error fetching pemindahan_arsip_link for export:", pemindahanError.message);
      }

      const idsToExclude = pemindahanLinks?.map((link: any) => link.id_arsip_aktif_fkey).filter((id: any) => id != null) || [];
      console.log(`Found ${idsToExclude.length} IDs to exclude`);

      // 2. Build main query dengan optimasi
      let query = supabase
        .from("arsip_aktif")
        .select(`
        id_arsip_aktif, nomor_berkas, kode_klasifikasi, uraian_informasi, 
        kurun_waktu, jumlah, tingkat_perkembangan, media_simpan, 
        jangka_simpan, created_at, status_persetujuan,
        lokasi_penyimpanan!inner (
          id_lokasi, no_filing_cabinet, no_laci, no_folder, id_bidang_fkey,
          daftar_bidang!inner (id_bidang, nama_bidang)
        )
      `)
        .eq("status_persetujuan", "Disetujui");

      // Exclude Sekretariat
      query = query.not('lokasi_penyimpanan.daftar_bidang.nama_bidang', 'eq', 'Sekretariat');

      // Apply exclusions in batches jika terlalu banyak
      if (idsToExclude.length > 0) {
        if (idsToExclude.length > 100) {
          // Jika terlalu banyak, proses dalam chunk
          const chunkSize = 100;
          for (let i = 0; i < idsToExclude.length; i += chunkSize) {
            const chunk = idsToExclude.slice(i, i + chunkSize);
            const idsString = `(${chunk.join(',')})`;
            query = query.not('id_arsip_aktif', 'in', idsString);
          }
        } else {
          const idsToExcludeString = `(${idsToExclude.join(',')})`;
          query = query.not('id_arsip_aktif', 'in', idsToExcludeString);
        }
      }

      // Apply date filter
      if (periode) {
        query = query.gte('created_at', periode.startDate).lte('created_at', periode.endDate);
      }

      // Apply ordering
      query = query.order('nama_bidang', { foreignTable: 'lokasi_penyimpanan.daftar_bidang', ascending: true })
        .order('nomor_berkas', { ascending: true });

      console.log('Executing main query...');

      // Execute dengan timeout
      const mainQueryPromise = query;
      const mainTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout fetching main data')), 30000)
      );

      const { data, error } = await Promise.race([
        mainQueryPromise,
        mainTimeoutPromise
      ]) as any;

      if (error) {
        console.error("Database error:", error);
        toast.error("Gagal memuat semua data arsip untuk ekspor: " + error.message);
        return [];
      }

      console.log(`Successfully fetched ${data?.length || 0} records`);
      return (data as unknown as ArsipAktifLaporanRow[]) || [];

    } catch (error: any) {
      console.error("Fetch error:", error);
      toast.error("Terjadi kesalahan saat mengambil data: " + error.message);
      return [];
    }
  };

  // Optimasi handleExportExcel dengan progress tracking
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

      console.log(`Fetching data for period: ${periodeString}`);

      // Fetch data dengan progress
      const allArsipForExport = await fetchAllArsipForExport({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      if (allArsipForExport.length === 0) {
        toast.info("Tidak ada data arsip aktif yang memenuhi kriteria untuk diekspor dalam periode yang dipilih.");
        return;
      }

      console.log(`Processing ${allArsipForExport.length} records for export...`);

      // Show progress untuk user
      toast.info(`Memproses ${allArsipForExport.length} arsip untuk diekspor. Mohon tunggu...`);

      // Export dengan error handling
      await exportLaporanArsipAktifKepalaDinasToExcel({
        data: allArsipForExport,
        periodeLaporan: periodeString
      });

      toast.success("Laporan berhasil diekspor ke Excel!");

    } catch (error: any) {
      console.error("Export Excel error:", error);
      toast.error(`Gagal mengekspor laporan: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [supabase, selectedSemester, selectedYear]);

  // Periode string untuk button
  let displayPeriodeString: string;
  if (selectedSemester === 'jan-jun') {
    displayPeriodeString = `Januari - Juni ${selectedYear}`;
  } else {
    displayPeriodeString = `Juli - Desember ${selectedYear}`;
  }

  return (
    <div className="w-full h-full p-6"> {/* Consistent page padding */}
      <div className="max-w-8xl mx-auto w-full h-full flex flex-col"> {/* Content wrapper */}
        <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col"> {/* Main content card */}
          <div className="bg-primary/10 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-primary">
              <BarChartBig size={24} /> Laporan Arsip Aktif (Telah Diverifikasi)
            </h2>

            {/* Tambahkan dropdown semester dan tahun */}
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
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20"> {/* Themed stats card */}
              <h3 className="text-lg font-semibold text-foreground">Total Arsip Aktif Diberkaskan</h3>
              <p className="text-3xl font-bold text-primary">{totalArsipDiberkaskan}</p>
              <p className="text-sm text-muted-foreground">Jumlah arsip aktif yang telah disetujui dan masuk ke sistem.</p>
            </div>

            <div>
              <label htmlFor="bidangFilter" className="block text-sm font-medium text-foreground mb-1.5"> {/* Adjusted margin */}
                <Filter size={16} className="inline mr-1" /> Filter Berdasarkan Bidang:
              </label>
              <select
                id="bidangFilter"
                value={selectedBidangId}
                onChange={handleBidangChange}
                // Consistent select styling
                className="w-full md:w-1/3 px-3 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm transition-colors duration-300"
              >
                <option value="">Semua Bidang</option>
                {daftarBidang.map((bidang) => (
                  <option key={bidang.id_bidang} value={bidang.id_bidang.toString()}>
                    {bidang.nama_bidang.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
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
                      {sortColumn === 'nomor_berkas' && (
                        sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />
                      )}
                      {sortColumn !== 'nomor_berkas' && <ChevronsUpDown size={12} className="inline ml-1 opacity-30" />}
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10"
                      onClick={() => handleSort('kode_klasifikasi')}
                    >
                      Kode
                      {sortColumn === 'kode_klasifikasi' && (
                        sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />
                      )}
                      {sortColumn !== 'kode_klasifikasi' && <ChevronsUpDown size={12} className="inline ml-1 opacity-30" />}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Uraian Informasi</th>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10"
                      onClick={() => handleSort('nama_bidang')}
                    >
                      Bidang
                      {sortColumn === 'nama_bidang' && (
                        sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1" /> : <ArrowDown size={12} className="inline ml-1" />
                      )}
                      {sortColumn !== 'nama_bidang' && <ChevronsUpDown size={12} className="inline ml-1 opacity-30" />}
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Kurun Waktu</th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Jumlah</th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Tingkat</th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Media</th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Jangka Simpan</th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Lokasi Fisik</th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {arsipList.map((arsip) => (
                    <tr key={arsip.id_arsip_aktif} className="hover:bg-muted transition-colors duration-150">
                      <td className="px-3 py-3 text-sm text-center">{arsip.nomor_berkas}</td>
                      <td className="px-3 py-3 text-sm text-left">{arsip.kode_klasifikasi}</td>
                      <td className="px-3 py-3 text-sm text-left max-w-xs truncate" title={arsip.uraian_informasi}>{arsip.uraian_informasi}</td>
                      <td className="px-3 py-3 text-sm text-left">{arsip.lokasi_penyimpanan?.daftar_bidang?.nama_bidang.replace(/_/g, " ") || '-'}</td>
                      <td className="px-3 py-3 text-sm text-center">{arsip.kurun_waktu || '-'}</td>
                      <td className="px-3 py-3 text-sm text-center">{arsip.jumlah || '-'}</td>
                      <td className="px-3 py-3 text-sm text-center">{arsip.tingkat_perkembangan || '-'}</td>
                      <td className="px-3 py-3 text-sm text-center">{arsip.media_simpan || '-'}</td>
                      <td className="px-3 py-3 text-sm text-center">{arsip.jangka_simpan || '-'}</td>
                      <td className="px-3 py-3 text-sm text-center">
                        {arsip.lokasi_penyimpanan
                          ? `${arsip.lokasi_penyimpanan.no_filing_cabinet || '-'}/${arsip.lokasi_penyimpanan.no_laci || '-'}/${arsip.lokasi_penyimpanan.no_folder || '-'}`
                          : '-/-/-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-center whitespace-nowrap">
                        <Link href={`/arsip/arsip-aktif/detail/${arsip.id_arsip_aktif}`} passHref>
                          <button
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary group transition-all duration-150 ease-in-out"
                            title="Lihat Detail"
                            aria-label="Lihat Detail Arsip"
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
                  {selectedBidangId ? "Tidak ada arsip aktif yang disetujui untuk bidang ini." : "Tidak ada arsip aktif yang disetujui ditemukan."}
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