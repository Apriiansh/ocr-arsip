"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { exportArsipAktifToExcel } from './components/DaftarArsipAktifExcel';
import { useAuth } from "@/context/AuthContext";

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
  status_persetujuan: string | null;
  akses: string | null;
  lokasi_penyimpanan: LokasiPenyimpanan | LokasiPenyimpanan[] | null;
}
export interface IsiBerkasRow {
  id_isi_arsip: string;
  id_berkas_induk_fkey: string;
  nomor_item: string;
  kode_klasifikasi: string;
  uraian_informasi: string;
  kurun_waktu: string | null;
  jumlah: number | null;
  keterangan: string | null;
  jangka_simpan: string | null;
  tingkat_perkembangan: string | null;
  media_simpan: string | null;
  file_url: string | null;
  berkas_arsip_aktif: {
    nomor_berkas: number;
    uraian_informasi: string;
    akses: string | null;
    lokasi_penyimpanan: LokasiPenyimpanan | LokasiPenyimpanan[] | null;
  } | null;
}

export type ViewMode = "berkas" | "isiBerkas";

export function useDaftarArsipAktif() {
  const supabase = createClient();
  const router = useRouter();
  const [arsipList, setArsipList] = useState<ArsipRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dataLoading, setDataLoading] = useState(true); // Untuk data fetch
  const { user, isLoading: isAuthLoading, error: authError } = useAuth(); // Gunakan useAuth
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10; // Jumlah item per halaman
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'nomor_berkas', direction: 'asc' });
  const [isReordering, setIsReordering] = useState(false); // State untuk loading saat reorder
  const [isExporting, setIsExporting] = useState(false); // State untuk loading saat export
  const [statusFilterAktif, setStatusFilterAktif] = useState<string>("Semua"); // "Semua", "Menunggu", "Disetujui", "Ditolak"
  const [viewMode, setViewMode] = useState<ViewMode>("berkas");
  const [isiBerkasList, setIsiBerkasList] = useState<IsiBerkasRow[]>([]);

  const ALLOWED_ROLE = "Pegawai";
  const DEFAULT_HOME_PATH = "/"; // Akan di-handle oleh HomeRedirect

  // Helper functions for sorting, defined once for reusability
  const compareKlasifikasi = (kodeA: string, kodeB: string): number => {
    const partsA = (kodeA || '0').split('.').map(Number);
    const partsB = (kodeB || '0').split('.').map(Number);
    const len = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < len; i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA !== numB) {
        return numA - numB;
      }
    }
    return partsA.length - partsB.length; // e.g., 000.5.1 comes before 000.5.1.1
  };

  const getStartDate = (kurunWaktu: string | null): string => {
    if (!kurunWaktu) return '9999-12-31'; // Taruh data tanpa tanggal di akhir
    const startDateStr = kurunWaktu.split(' s.d. ')[0].trim();
    const [day, month, year] = startDateStr.split('-');
    if (!day || !month || !year) return '9999-12-31'; // Format tidak valid
    return `${year}-${month}-${day}`; // Format YYYY-MM-DD agar bisa dibandingkan sebagai string
  };

  const fetchData = useCallback(async () => {
    if (user?.id_bidang_fkey === null || user?.id_bidang_fkey === undefined) {
      console.log("fetchData (daftar-aktif): user.id_bidang_fkey is null or undefined, aborting fetch.");
      setDataLoading(false);
      setArsipList([]);
      setIsiBerkasList([]);
      setTotalPages(0);
      return;
    }
    setDataLoading(true);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage - 1;

    try {
      if (viewMode === "berkas") {
        const { data: pemindahanLinks, error: pemindahanError } = await supabase
          .from('pemindahan_arsip_link')
          .select('id_arsip_aktif_fkey');

        if (pemindahanError) {
          toast.error("Gagal memuat data link pemindahan: " + pemindahanError.message);
          setArsipList([]);
          setTotalPages(0);
          setDataLoading(false);
          return;
        }
        const idsToExclude = pemindahanLinks?.map(link => link.id_arsip_aktif_fkey).filter(id => id != null) || [];

        let query = supabase
          .from("arsip_aktif")
          .select(`
            id_arsip_aktif, nomor_berkas, kode_klasifikasi, uraian_informasi, kurun_waktu, jumlah, 
            keterangan, jangka_simpan, tingkat_perkembangan, media_simpan, status_persetujuan, akses,
            lokasi_penyimpanan!inner (id_bidang_fkey, no_filing_cabinet, no_laci, no_folder)
          `, { count: "exact" })
          .eq('lokasi_penyimpanan.id_bidang_fkey', user.id_bidang_fkey);

        if (idsToExclude.length > 0) {
          query = query.not('id_arsip_aktif', 'in', `(${idsToExclude.join(',')})`);
        }
        if (statusFilterAktif !== "Semua") {
          query = query.eq('status_persetujuan', statusFilterAktif);
        }
        // Terapkan pengurutan utama
        query = query.order(sortConfig.key as keyof ArsipRow, { ascending: sortConfig.direction === 'asc' });

        // Terapkan pengurutan sekunder untuk konsistensi
        if (sortConfig.key === 'kode_klasifikasi' || sortConfig.key === 'uraian_informasi') {
          // Jika mengurutkan berdasarkan teks, urutan sekunder adalah nomor berkas
          query = query.order('nomor_berkas', { ascending: true });
        }
        
        // Selalu tambahkan id_arsip_aktif sebagai tie-breaker terakhir untuk urutan yang stabil
        query = query.order('id_arsip_aktif', { ascending: true });
        
        const { data, error, count } = await query.range(startIndex, endIndex);

        if (error) throw error;
        setArsipList((data as unknown as ArsipRow[]) || []);
        setIsiBerkasList([]); // Clear other mode's data
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));

      } else if (viewMode === "isiBerkas") {
        const { data: pemindahanIsiLinks, error: pemindahanIsiError } = await supabase
          .from('pemindahan_isi_berkas')
          .select('id_isi_arsip');
        if (pemindahanIsiError) {
          toast.error("Gagal memuat data pemindahan isi berkas: " + pemindahanIsiError.message);
          setIsiBerkasList([]);
          setArsipList([]);
          setTotalPages(0);
          setDataLoading(false);
          return;
        }
        const isiIdsToExclude = pemindahanIsiLinks?.map(link => link.id_isi_arsip).filter(id => id != null) || [];    

        let query = supabase
          .from("isi_berkas_arsip")
          .select(`
            id_isi_arsip, id_berkas_induk_fkey, nomor_item, kode_klasifikasi, uraian_informasi,
            kurun_waktu, jumlah, keterangan, jangka_simpan, tingkat_perkembangan, media_simpan, file_url,
            berkas_arsip_aktif:id_berkas_induk_fkey!inner (
              nomor_berkas, uraian_informasi, akses,
              lokasi_penyimpanan!inner(id_bidang_fkey)
            )
          `, { count: "exact" })
          .eq('berkas_arsip_aktif.lokasi_penyimpanan.id_bidang_fkey', user.id_bidang_fkey);

        if (isiIdsToExclude.length > 0) {
          query = query.not('id_isi_arsip', 'in', `(${isiIdsToExclude.join(',')})`);
        }

        // Untuk mode isiBerkas, kita akan fetch semua data dulu, lalu sort di client-side
        // karena pengurutan nomor_item perlu dilakukan secara numerik
        const { data: allData, error, count } = await query;

        if (error) throw error;

        // Sort data di client-side dengan logika numerik yang benar
        const sortedData = (allData as unknown as IsiBerkasRow[])?.sort((a, b) => {
          // Extract nomor berkas dari nomor_item (bagian sebelum titik)
          const getNomorBerkas = (nomorItem: string) => {
            const parts = nomorItem.split('.');
            return parseInt(parts[0] || "0", 10);
          };

          // Extract nomor item dari nomor_item (bagian setelah titik)
          const getNomorItem = (nomorItem: string) => {
            const parts = nomorItem.split('.');
            return parseInt(parts[1] || "0", 10);
          };

          if (sortConfig.key === 'nomor_item') {
            // Sort berdasarkan nomor berkas dulu, kemudian nomor item
            const berkasA = getNomorBerkas(a.nomor_item);
            const berkasB = getNomorBerkas(b.nomor_item);

            if (berkasA !== berkasB) {
              return sortConfig.direction === 'asc' ? berkasA - berkasB : berkasB - berkasA;
            }

            // Jika nomor berkas sama, sort berdasarkan nomor item
            const itemA = getNomorItem(a.nomor_item);
            const itemB = getNomorItem(b.nomor_item);
            return sortConfig.direction === 'asc' ? itemA - itemB : itemB - itemA;

          } else if (sortConfig.key === 'kode_klasifikasi') {
            const kodeCompare = (a.kode_klasifikasi || '').localeCompare(b.kode_klasifikasi || '');
            if (kodeCompare !== 0) {
              return sortConfig.direction === 'asc' ? kodeCompare : -kodeCompare;
            }
            // Secondary sort by nomor_item jika kode sama
            const berkasA = getNomorBerkas(a.nomor_item);
            const berkasB = getNomorBerkas(b.nomor_item);
            if (berkasA !== berkasB) return berkasA - berkasB;
            const itemA = getNomorItem(a.nomor_item);
            const itemB = getNomorItem(b.nomor_item);
            return itemA - itemB;

          } else if (sortConfig.key === 'uraian_informasi') {
            const uraianCompare = (a.uraian_informasi || '').localeCompare(b.uraian_informasi || '');
            if (uraianCompare !== 0) {
              return sortConfig.direction === 'asc' ? uraianCompare : -uraianCompare;
            }
            // Secondary sort by nomor_item jika uraian sama
            const berkasA = getNomorBerkas(a.nomor_item);
            const berkasB = getNomorBerkas(b.nomor_item);
            if (berkasA !== berkasB) return berkasA - berkasB;
            const itemA = getNomorItem(a.nomor_item);
            const itemB = getNomorItem(b.nomor_item);
            return itemA - itemB;
          }

          // Default sort by nomor_item
          const berkasA = getNomorBerkas(a.nomor_item);
          const berkasB = getNomorBerkas(b.nomor_item);
          if (berkasA !== berkasB) return berkasA - berkasB;
          const itemA = getNomorItem(a.nomor_item);
          const itemB = getNomorItem(b.nomor_item);
          return itemA - itemB;
        }) || [];

        // Apply pagination pada data yang sudah di-sort
        const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

        setIsiBerkasList(paginatedData);
        setArsipList([]); 
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      }
    } catch (e: any) {
      toast.error("Gagal memuat data: " + e.message);
      setArsipList([]);
      setIsiBerkasList([]);
      setTotalPages(0);
    } finally {
      setDataLoading(false);
    }
  }, [currentPage, itemsPerPage, supabase, user, sortConfig, statusFilterAktif, viewMode]);

  useEffect(() => {
    console.log("useEffect (auth check): Running checkAuth...");
    const checkAuth = async () => {
      // Jika AuthContext masih loading, tunggu
      if (isAuthLoading) return;

      // Jika ada error dari AuthContext, tampilkan dan jangan lanjutkan
      if (authError) {
        toast.error(`Error Autentikasi: ${authError}`);
        // router.push(SIGN_IN_PATH); // AuthContext mungkin sudah redirect
        return;
      }

      // Jika tidak ada user setelah AuthContext selesai loading, redirect (AuthContext seharusnya sudah melakukan ini)
      if (!user) {
        // router.push(SIGN_IN_PATH); // AuthContext handles this
        return;
      }

      // Verifikasi role pengguna
      if (user.role !== ALLOWED_ROLE) {
        toast.warn("Anda tidak memiliki izin untuk mengakses halaman ini.");
        router.push(DEFAULT_HOME_PATH); // HomeRedirect akan mengarahkan sesuai peran
        return;
      }

      // Pastikan data bidang pengguna tersedia
      if (!user.id_bidang_fkey) {
         toast.warn("Data bidang pengguna tidak lengkap. Silakan login kembali atau hubungi admin.");
         // router.push(SIGN_IN_PATH); // AuthContext might handle redirect
         return;
      }
    };
    checkAuth();
  }, [user, isAuthLoading, authError, router, ALLOWED_ROLE, DEFAULT_HOME_PATH]);

  useEffect(() => {
    if (user?.id_bidang_fkey && !isAuthLoading) { // Hanya panggil fetchData jika userBidangId sudah terisi dan auth tidak loading
      console.log(`useEffect (fetchData trigger): user.id_bidang_fkey is ${user.id_bidang_fkey}, calling fetchData.`);
      fetchData();
    } else {
      console.log("useEffect (fetchData trigger): user.id_bidang_fkey is null or auth is loading, skipping fetchData.");
    }
  }, [user, isAuthLoading, currentPage, fetchData, sortConfig, statusFilterAktif]); // Ganti userBidangId dengan user dan isAuthLoading

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  }, []);

  const filteredArsip = useMemo(() => {
    return arsipList.filter(
      (arsip) =>
        arsip.kode_klasifikasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arsip.uraian_informasi.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [arsipList, searchTerm]);

  const filteredIsiBerkas = useMemo(() => {
    return isiBerkasList.filter(
      (item) =>
        item.kode_klasifikasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.uraian_informasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nomor_item.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [isiBerkasList, searchTerm]);

  const handleDelete = useCallback(async (id: string, type: 'berkas' | 'isiBerkas') => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${type === 'berkas' ? 'berkas' : 'item isi berkas'} ini?`)) return;
    setDataLoading(true); // Tampilkan loading saat menghapus

    const fromTable = type === 'berkas' ? 'arsip_aktif' : 'isi_berkas_arsip';
    const idColumn = type === 'berkas' ? 'id_arsip_aktif' : 'id_isi_arsip';

    const { error } = await supabase
      .from(fromTable)
      .delete()
      .eq(idColumn, id);

    if (error) {
      toast.error(`Gagal menghapus ${type === 'berkas' ? 'berkas' : 'item isi berkas'}.`);
      console.error("Error deleting data:", error.message || error);
      setDataLoading(false);
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

  const handleSortRequest = (key: string) => {
    setSortConfig(currentSortConfig => {
      if (currentSortConfig.key === key) {
        return { key, direction: currentSortConfig.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
    setCurrentPage(1); // Reset ke halaman pertama saat sorting berubah
  };

  const handleExportExcel = useCallback(async () => {
    if (!user?.id_bidang_fkey) {
      toast.error("ID Bidang pengguna tidak ditemukan.");
      return;
    }

    setIsExporting(true);

    try {
      // 1. Fetch ALL arsip_aktif data yang sudah disetujui
      const { data: pemindahanLinks, error: pemindahanError } = await supabase
        .from('pemindahan_arsip_link')
        .select('id_arsip_aktif_fkey');

      if (pemindahanError) {
        throw new Error("Gagal memuat data link pemindahan: " + pemindahanError.message);
      }

      const idsToExclude = pemindahanLinks?.map(link => link.id_arsip_aktif_fkey).filter(id => id != null) || [];

      // Fetch semua berkas arsip aktif yang DISETUJUI
      let berkasQuery = supabase
        .from("arsip_aktif")
        .select(`
        id_arsip_aktif, nomor_berkas, kode_klasifikasi, uraian_informasi, kurun_waktu, jumlah, 
        keterangan, jangka_simpan, tingkat_perkembangan, media_simpan, status_persetujuan, akses,
        lokasi_penyimpanan!inner (id_bidang_fkey, no_filing_cabinet, no_laci, no_folder)
      `)
        .eq('lokasi_penyimpanan.id_bidang_fkey', user.id_bidang_fkey)
        .eq('status_persetujuan', 'Disetujui'); // Hanya yang sudah disetujui

      if (idsToExclude.length > 0) {
        berkasQuery = berkasQuery.not('id_arsip_aktif', 'in', `(${idsToExclude.join(',')})`);
      }

      // Apply search filter jika ada
      if (searchTerm.trim()) {
        berkasQuery = berkasQuery.or(`kode_klasifikasi.ilike.%${searchTerm}%,uraian_informasi.ilike.%${searchTerm}%`);
      }

      // PERBAIKAN: Fetch data tanpa sorting di database, kita akan sort di client-side
      const { data: allBerkasData, error: berkasError } = await berkasQuery;

      if (berkasError) {
        throw new Error("Gagal mengambil data berkas: " + berkasError.message);
      }

      // PERBAIKAN: Sort berkas data dengan logika yang sama seperti di fetchData
      const sortedBerkasData = (allBerkasData as unknown as ArsipRow[])?.sort((a, b) => {
        if (sortConfig.key === 'nomor_berkas') {
          if (sortConfig.direction === 'asc') {
            return (a.nomor_berkas || 0) - (b.nomor_berkas || 0);
          } else {
            return (b.nomor_berkas || 0) - (a.nomor_berkas || 0);
          }
        } else if (sortConfig.key === 'kode_klasifikasi') {
          const kodeCompare = (a.kode_klasifikasi || '').localeCompare(b.kode_klasifikasi || '');
          if (kodeCompare !== 0) {
            return sortConfig.direction === 'asc' ? kodeCompare : -kodeCompare;
          }
          // Secondary sort by nomor_berkas, then by id as tie-breaker
          const nomorCompare = (a.nomor_berkas || 0) - (b.nomor_berkas || 0);
          if (nomorCompare !== 0) return nomorCompare;
          return (a.id_arsip_aktif || '').localeCompare(b.id_arsip_aktif || '');

        } else if (sortConfig.key === 'uraian_informasi') {
          const uraianCompare = (a.uraian_informasi || '').localeCompare(b.uraian_informasi || '');
          if (uraianCompare !== 0) {
            return sortConfig.direction === 'asc' ? uraianCompare : -uraianCompare;
          }
          // Secondary sort by nomor_berkas, then by id as tie-breaker
          const nomorCompare = (a.nomor_berkas || 0) - (b.nomor_berkas || 0);
          if (nomorCompare !== 0) return nomorCompare;
          return (a.id_arsip_aktif || '').localeCompare(b.id_arsip_aktif || '');
        }

        // Default sort by nomor_berkas, then by id as tie-breaker
        const nomorCompare = (a.nomor_berkas || 0) - (b.nomor_berkas || 0);
        if (nomorCompare !== 0) return nomorCompare;
        return (a.id_arsip_aktif || '').localeCompare(b.id_arsip_aktif || '');
      }) || [];

      // 2. Fetch ALL daftar isi arsip aktif (tanpa filter status persetujuan)
      let isiQuery = supabase
        .from("isi_berkas_arsip")
        .select(`
        id_isi_arsip, id_berkas_induk_fkey, nomor_item, kode_klasifikasi, uraian_informasi,
        kurun_waktu, jumlah, keterangan, jangka_simpan, tingkat_perkembangan, media_simpan, file_url,
        berkas_arsip_aktif:id_berkas_induk_fkey!inner (
          nomor_berkas, uraian_informasi, akses,
          lokasi_penyimpanan!inner(id_bidang_fkey)
        )
      `)
        .eq('berkas_arsip_aktif.lokasi_penyimpanan.id_bidang_fkey', user.id_bidang_fkey);

      // Apply search filter jika ada
      if (searchTerm.trim()) {
        isiQuery = isiQuery.or(`kode_klasifikasi.ilike.%${searchTerm}%,uraian_informasi.ilike.%${searchTerm}%,nomor_item.ilike.%${searchTerm}%`);
      }

      const { data: allIsiData, error: isiError } = await isiQuery;

      if (isiError) {
        throw new Error("Gagal mengambil data isi berkas: " + isiError.message);
      }

      // PERBAIKAN: Sort isi berkas data dengan logika yang SAMA PERSIS seperti di fetchData
      const sortedIsiData = (allIsiData as unknown as IsiBerkasRow[])?.sort((a, b) => {
        // Extract nomor berkas dari nomor_item (bagian sebelum titik)
        const getNomorBerkas = (nomorItem: string) => {
          const parts = nomorItem.split('.');
          return parseInt(parts[0] || "0", 10);
        };

        // Extract nomor item dari nomor_item (bagian setelah titik)
        const getNomorItem = (nomorItem: string) => {
          const parts = nomorItem.split('.');
          return parseInt(parts[1] || "0", 10);
        };

        if (sortConfig.key === 'nomor_item') {
          // Sort berdasarkan nomor berkas dulu, kemudian nomor item
          const berkasA = getNomorBerkas(a.nomor_item);
          const berkasB = getNomorBerkas(b.nomor_item);

          if (berkasA !== berkasB) {
            return sortConfig.direction === 'asc' ? berkasA - berkasB : berkasB - berkasA;
          }

          // Jika nomor berkas sama, sort berdasarkan nomor item
          const itemA = getNomorItem(a.nomor_item);
          const itemB = getNomorItem(b.nomor_item);
          return sortConfig.direction === 'asc' ? itemA - itemB : itemB - itemA;

        } else if (sortConfig.key === 'kode_klasifikasi') {
          const kodeCompare = (a.kode_klasifikasi || '').localeCompare(b.kode_klasifikasi || '');
          if (kodeCompare !== 0) {
            return sortConfig.direction === 'asc' ? kodeCompare : -kodeCompare;
          }
          // Secondary sort by nomor_item jika kode sama
          const berkasA = getNomorBerkas(a.nomor_item);
          const berkasB = getNomorBerkas(b.nomor_item);
          if (berkasA !== berkasB) return berkasA - berkasB;
          const itemA = getNomorItem(a.nomor_item);
          const itemB = getNomorItem(b.nomor_item);
          return itemA - itemB;

        } else if (sortConfig.key === 'uraian_informasi') {
          const uraianCompare = (a.uraian_informasi || '').localeCompare(b.uraian_informasi || '');
          if (uraianCompare !== 0) {
            return sortConfig.direction === 'asc' ? uraianCompare : -uraianCompare;
          }
          // Secondary sort by nomor_item jika uraian sama
          const berkasA = getNomorBerkas(a.nomor_item);
          const berkasB = getNomorBerkas(b.nomor_item);
          if (berkasA !== berkasB) return berkasA - berkasB;
          const itemA = getNomorItem(a.nomor_item);
          const itemB = getNomorItem(b.nomor_item);
          return itemA - itemB;
        }

        // Default sort by nomor_item
        const berkasA = getNomorBerkas(a.nomor_item);
        const berkasB = getNomorBerkas(b.nomor_item);
        if (berkasA !== berkasB) return berkasA - berkasB;
        const itemA = getNomorItem(a.nomor_item);
        const itemB = getNomorItem(b.nomor_item);
        return itemA - itemB;
      }) || [];

      // Debug log untuk memastikan data yang akan diekspor
      console.log("DEBUG - Data yang akan diekspor:");
      console.log("- Total berkas (disetujui):", sortedBerkasData?.length || 0);
      console.log("- Total isi berkas:", sortedIsiData.length);

      // Periksa apakah ada data untuk diekspor
      if ((!sortedBerkasData || sortedBerkasData.length === 0) && sortedIsiData.length === 0) {
        toast.warn("Tidak ada data arsip yang disetujui untuk diekspor.");
        return;
      }

      // Panggil fungsi export dengan semua data yang sudah diurutkan
      await exportArsipAktifToExcel({
        berkasData: sortedBerkasData || [],
        isiBerkasData: sortedIsiData,
        userBidangId: user?.id_bidang_fkey,
      });

      toast.success(`Data arsip berhasil diekspor ke Excel! (${sortedBerkasData?.length || 0} berkas, ${sortedIsiData.length} isi berkas)`);

    } catch (error: any) {
      toast.error("Gagal mengekspor data ke Excel: " + error.message);
      console.error("Export Excel error:", error);
    } finally {
      setIsExporting(false);
    }
  }, [user?.id_bidang_fkey, searchTerm, sortConfig, supabase]);

  const handleReorderAndSaveNomorBerkas = async () => {
    if (viewMode === 'isiBerkas') {
      toast.info("Penataan ulang nomor hanya berlaku untuk mode Berkas Arsip Aktif.");
      return;
    }

    if (!user?.id_bidang_fkey) {
      toast.error("ID Bidang pengguna tidak ditemukan.");
      return;
    }
  
    const confirmation = window.confirm(
      `Anda akan menata ulang nomor berkas untuk semua Berkas Arsip Aktif di bidang Anda. Berkas akan diurutkan berdasarkan: 1. Kode Klasifikasi (natural), 2. Tanggal Mulai Kurun Waktu. Ini akan mengubah nomor berkas secara permanen. Lanjutkan?`
    ); // Changed text for clarity
  
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
          kurun_waktu,
          lokasi_penyimpanan!inner(id_bidang_fkey)
        `)
        .eq('lokasi_penyimpanan.id_bidang_fkey', user.id_bidang_fkey);
  
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
        // 1. Urutkan berdasarkan Kode Klasifikasi (natural)
        const klasifikasiCompare = compareKlasifikasi(a.kode_klasifikasi, b.kode_klasifikasi);
        if (klasifikasiCompare !== 0) return klasifikasiCompare;

        // 2. Urutkan berdasarkan Tanggal Mulai Kurun Waktu
        const dateCompare = getStartDate(a.kurun_waktu).localeCompare(getStartDate(b.kurun_waktu));
        if (dateCompare !== 0) return dateCompare;
      
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

  const handleReorderAndSaveNomorItem = async () => {
    if (viewMode === 'berkas') {
      toast.info("Penataan ulang nomor item hanya berlaku untuk mode Isi Berkas.");
      return;
    }

    if (!user?.id_bidang_fkey) {
      toast.error("ID Bidang pengguna tidak ditemukan.");
      return;
    }

    const confirmation = window.confirm(
      `Anda akan menata ulang nomor item untuk semua Isi Berkas di bidang Anda. Item akan diurutkan berdasarkan: 1. Kode Klasifikasi (natural), 2. Kurun Waktu (terlama ke terbaru). Ini akan mengubah nomor item secara permanen. Lanjutkan?`
    );

    if (!confirmation) return;

    setIsReordering(true);
    toast.info("Memproses penataan ulang nomor item...");

    try {
      // 1. Fetch IDs from pemindahan_isi_berkas to exclude
      const { data: pemindahanIsiLinks, error: pemindahanIsiError } = await supabase
        .from('pemindahan_isi_berkas')
        .select('id_isi_arsip');

      if (pemindahanIsiError) {
        throw new Error("Gagal memuat data link pemindahan isi berkas: " + pemindahanIsiError.message);
      }
      const isiIdsToExclude = pemindahanIsiLinks?.map(link => link.id_isi_arsip).filter(id => id != null) || [];

      // 2. Fetch ALL isi_berkas_arsip data for the current user's bidang, excluding moved ones
      // Also fetch the parent berkas_arsip_aktif's nomor_berkas for sorting
      let allIsiQuery = supabase
        .from("isi_berkas_arsip")
        .select(`
          id_isi_arsip,
          id_berkas_induk_fkey,
          kode_klasifikasi,
          kurun_waktu,
          berkas_arsip_aktif:id_berkas_induk_fkey!inner (nomor_berkas, lokasi_penyimpanan!inner(id_bidang_fkey))
        `)
        .eq('berkas_arsip_aktif.lokasi_penyimpanan.id_bidang_fkey', user.id_bidang_fkey);

      if (isiIdsToExclude.length > 0) {
        const isiIdsToExcludeString = `(${isiIdsToExclude.join(',')})`;
        allIsiQuery = allIsiQuery.not('id_isi_arsip', 'in', isiIdsToExcludeString);
      }

      const { data: allIsiArsip, error: allIsiArsipError } = await allIsiQuery;

      if (allIsiArsipError) {
        throw new Error("Gagal mengambil semua data isi arsip untuk penataan ulang: " + allIsiArsipError.message);
      }

      if (!allIsiArsip || allIsiArsip.length === 0) {
        toast.info("Tidak ada isi arsip untuk ditata ulang.");
        setIsReordering(false);
        return;
      }

      // Group by id_berkas_induk_fkey and sort within each group
      const groupedIsiArsip = allIsiArsip.reduce((acc, item) => {
        const berkasId = item.id_berkas_induk_fkey;
        if (berkasId) {
          if (!acc[berkasId]) acc[berkasId] = [];
          acc[berkasId].push(item);
        }
        return acc;
      }, {} as Record<string, (typeof allIsiArsip)[number][]>);

      const updatePromises: Promise<any>[] = [];
      for (const berkasId in groupedIsiArsip) {
        const itemsInBerkas = groupedIsiArsip[berkasId].sort((a, b) => {
          // Sort by kode_klasifikasi (natural), then kurun_waktu, then id_isi_arsip (tie-breaker)
          const klasifikasiCompare = compareKlasifikasi(a.kode_klasifikasi, b.kode_klasifikasi);
          if (klasifikasiCompare !== 0) return klasifikasiCompare;
          const dateCompare = getStartDate(a.kurun_waktu).localeCompare(getStartDate(b.kurun_waktu));
          if (dateCompare !== 0) return dateCompare;
          return (a.id_isi_arsip || '').localeCompare(b.id_isi_arsip || '');
        });

        itemsInBerkas.forEach((item, index) => {
          const berkasInduk = Array.isArray(item.berkas_arsip_aktif) ? item.berkas_arsip_aktif[0] : item.berkas_arsip_aktif;
          const newNomorItem = `${berkasInduk?.nomor_berkas}.${index + 1}`;
          updatePromises.push(Promise.resolve(
            supabase
              .from("isi_berkas_arsip")
              .update({ nomor_item: newNomorItem })
              .eq("id_isi_arsip", item.id_isi_arsip)
            ));
        });
      }
      
      await Promise.all(updatePromises);
      toast.success(`Nomor item untuk ${allIsiArsip.length} isi arsip berhasil ditata ulang dan disimpan!`);
    } catch (error: any) {
      console.error("Error during reorder and save item:", error);
      toast.error("Terjadi kesalahan saat menata ulang nomor item: " + error.message);
    } finally {
      setIsReordering(false);
      fetchData(); // Refresh data pada halaman saat ini
    }
  };

  const handleViewModeChange = (newMode: ViewMode) => {
    if (newMode !== viewMode) {
      setViewMode(newMode);
      setSearchTerm("");
      setCurrentPage(1);
      // Reset sort config or adjust based on new mode's default
      setSortConfig({ key: newMode === 'berkas' ? 'nomor_berkas' : 'nomor_item', direction: 'asc' });
    }
  };

  return {
    user,
    arsipList,
    isiBerkasList,
    searchTerm,
    dataLoading,
    isAuthLoading,
    authError,
    currentPage,
    totalPages,
    sortConfig,
    isReordering,
    isExporting,
    statusFilterAktif,
    viewMode,
    filteredArsip,
    filteredIsiBerkas,
    handleSearch,
    handleDelete,
    handleNextPage,
    handlePrevPage,
    handleSortRequest,
    handleExportExcel,
    handleReorderAndSaveNomorBerkas,
    handleReorderAndSaveNomorItem, // Export the new function
    handleViewModeChange,
    setStatusFilterAktif,
    setCurrentPage,
  };
}