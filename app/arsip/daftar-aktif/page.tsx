"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, Trash2, Eye, FileText, FolderOpen, Filter, Archive, FileSpreadsheet, ListChecks } from "lucide-react"; // Tambahkan FileSpreadsheet dan ListChecks
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { exportArsipAktifToExcel } from './components/DaftarArsipAktifExcel';
import { useAuth } from "@/context/AuthContext";
import Loading from "./loading";

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

type ViewMode = "berkas" | "isiBerkas";

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
        query = query.order(sortConfig.key as keyof ArsipRow, { ascending: sortConfig.direction === 'asc' });
        if (sortConfig.key === 'nomor_berkas') query = query.order('id_arsip_aktif', { ascending: true });
        else if (sortConfig.key === 'kode_klasifikasi') {
          query = query.order('nomor_berkas', { ascending: true });
          query = query.order('id_arsip_aktif', { ascending: true });
        } else query = query.order('id_arsip_aktif', { ascending: true });

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
          .from("daftar_isi_arsip_aktif")
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

    const fromTable = type === 'berkas' ? 'arsip_aktif' : 'daftar_isi_arsip_aktif';
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

  // Perbaikan untuk handleExportExcel function
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
          // Secondary sort by nomor_berkas
          return (a.nomor_berkas || 0) - (b.nomor_berkas || 0);
        } else if (sortConfig.key === 'uraian_informasi') {
          const uraianCompare = (a.uraian_informasi || '').localeCompare(b.uraian_informasi || '');
          if (uraianCompare !== 0) {
            return sortConfig.direction === 'asc' ? uraianCompare : -uraianCompare;
          }
          // Secondary sort by nomor_berkas
          return (a.nomor_berkas || 0) - (b.nomor_berkas || 0);
        }

        // Default sort by nomor_berkas
        return (a.nomor_berkas || 0) - (b.nomor_berkas || 0);
      }) || [];

      // 2. Fetch ALL daftar isi arsip aktif (tanpa filter status persetujuan)
      let isiQuery = supabase
        .from("daftar_isi_arsip_aktif")
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
  const getSortIndicator = (key: string) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? '↑' : '↓';
    }
    return <span className="opacity-0 group-hover:opacity-50 transition-opacity">↕</span>;
  };
  
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
      `Anda akan menata ulang nomor berkas untuk semua Berkas Arsip Aktif di bidang Anda. Berkas akan diurutkan berdasarkan Kode Klasifikasi, lalu nomor laci, nomor folder, dan tanggal pembuatan. Ini akan mengubah nomor berkas. Lanjutkan?`
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

  const handleViewModeChange = (newMode: ViewMode) => {
    if (newMode !== viewMode) {
      setViewMode(newMode);
      setSearchTerm("");
      setCurrentPage(1);
      // Reset sort config or adjust based on new mode's default
      setSortConfig({ key: newMode === 'berkas' ? 'nomor_berkas' : 'nomor_item', direction: 'asc' });
    }
  };
  
  if (isAuthLoading || dataLoading) {
    return <Loading />;
  }

  if (authError) {
    return <div className="flex items-center justify-center h-full text-red-500">Error Autentikasi: {authError}</div>;
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
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-center sm:justify-end items-center">
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
              <button
                onClick={() => handleViewModeChange("berkas")}
                disabled={dataLoading}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ease-in-out flex items-center gap-1
                            ${viewMode === 'berkas' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}
              >
                <FolderOpen size={14} /> Berkas
              </button>
              <button
                onClick={() => handleViewModeChange("isiBerkas")}
                disabled={dataLoading}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ease-in-out flex items-center gap-1
                            ${viewMode === 'isiBerkas' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}
              >
                <ListChecks size={14} /> Isi Berkas
              </button>
            </div>
            <button
              onClick={handleExportExcel}
              disabled={isExporting || dataLoading || isAuthLoading || (viewMode === 'berkas' && filteredArsip.length === 0) || (viewMode === 'isiBerkas' && filteredIsiBerkas.length === 0)}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-green-600 text-green-600 rounded-lg text-xs font-medium hover:bg-green-600 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export data yang ditampilkan ke Excel"
            >
              <FileSpreadsheet size={18} />
              {isExporting ? "Mengekspor..." : "Export Excel"}
            </button>
            <Link 
              href="/arsip/visual-filing-cabinet" 
              className="inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/10 transition-colors duration-200"
              title="Lihat visualisasi filing cabinet"
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
              placeholder={viewMode === 'berkas' ? "Cari kode klasifikasi atau uraian berkas..." : "Cari nomor item, kode, atau uraian isi..."}
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-300"
            />
          </div>
        </div>
        
        {/* Action Buttons Section */}
        <div className="px-6 py-3 border-b border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          {viewMode === 'berkas' && (
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
          )}
          {viewMode === 'berkas' && (
            <button
                onClick={handleReorderAndSaveNomorBerkas}
                disabled={isReordering || dataLoading || isAuthLoading || arsipList.length === 0}
                className="px-4 py-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 text-sm font-medium"
            >
                {isReordering ? "Menyimpan..." : `Tata Ulang`}
            </button>
          )}
          {viewMode === 'isiBerkas' && <div className="w-full md:w-auto"></div> /* Placeholder to keep layout consistent */}
        </div>

        {/* Table Section */}
        <div className="p-6 flex-grow flex flex-col overflow-auto">
          {(viewMode === 'berkas' && filteredArsip.length > 0) || (viewMode === 'isiBerkas' && filteredIsiBerkas.length > 0) ? (
            <table className="min-w-full divide-y divide-border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  {viewMode === 'berkas' ? (
                    <>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10 group" onClick={() => handleSortRequest('nomor_berkas')}>
                        No. Berkas <span className="ml-1">{getSortIndicator('nomor_berkas')}</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10 group" onClick={() => handleSortRequest('kode_klasifikasi')}>
                        Kode Klasifikasi<span className="ml-1">{getSortIndicator('kode_klasifikasi')}</span>
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">No. Berkas</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10 group" onClick={() => handleSortRequest('nomor_item')}>
                        No. Item <span className="ml-1">{getSortIndicator('nomor_item')}</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted-foreground/10 group" onClick={() => handleSortRequest('kode_klasifikasi')}>
                        Kode Klasifikasi <span className="ml-1">{getSortIndicator('kode_klasifikasi')}</span>
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Uraian Informasi</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Kurun Waktu</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Jumlah</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Tingkat</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Media</th>
                  {viewMode === 'berkas' && <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Lokasi</th>}
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Jangka Simpan</th>
                  {viewMode === 'berkas' && <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Akses</th>}
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Keterangan</th>
                  {viewMode === 'berkas' && <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Status</th>}
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {viewMode === 'berkas' && filteredArsip.map((arsip) => (
                  <tr key={arsip.id_arsip_aktif} className="hover:bg-muted transition-colors duration-150">
                    <td className="px-4 py-3 text-sm text-center">{arsip.nomor_berkas}</td>
                    <td className="px-4 py-3 text-sm text-center">{arsip.kode_klasifikasi}</td>
                    <td className="px-4 py-3 text-sm text-justify max-w-xs truncate" title={arsip.uraian_informasi}>{arsip.uraian_informasi}</td>
                    <td className="px-4 py-3 text-sm text-center">{arsip.kurun_waktu || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">{arsip.jumlah || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">{arsip.tingkat_perkembangan || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">{arsip.media_simpan || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      {getLokasiObj(arsip.lokasi_penyimpanan)
                        ? `${getLokasiObj(arsip.lokasi_penyimpanan)?.no_filing_cabinet || '-'} / ${getLokasiObj(arsip.lokasi_penyimpanan)?.no_laci || '-'} / ${getLokasiObj(arsip.lokasi_penyimpanan)?.no_folder || '-'}`
                        : '- / - / -'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center max-w-xs truncate" title={arsip.jangka_simpan || undefined}>{arsip.jangka_simpan || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">{arsip.akses || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center max-w-xs truncate" title={arsip.keterangan || undefined}>{arsip.keterangan || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        arsip.status_persetujuan === "Disetujui" ? "bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-400"
                        : arsip.status_persetujuan === "Ditolak" ? "bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-400"
                        : arsip.status_persetujuan === "Menunggu" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/20 dark:text-yellow-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-700/20 dark:text-gray-400"
                      }`}>
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
                            onClick={() => handleDelete(arsip.id_arsip_aktif, 'berkas')}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-destructive group ml-2 transition-all duration-150 ease-in-out"
                            title="Hapus Arsip"
                            aria-label="Hapus Arsip"
                        >
                            <Trash2 size={18} className="transform group-hover:scale-110 transition-transform duration-150" />
                        </button>
                    </td>
                  </tr>
                ))}
                {viewMode === 'isiBerkas' && filteredIsiBerkas.map((item) => (
                  <tr key={item.id_isi_arsip} className="hover:bg-muted transition-colors duration-150">
                    <td className="px-4 py-3 text-sm text-center" title={item.berkas_arsip_aktif?.uraian_informasi}>
                      {item.berkas_arsip_aktif?.nomor_berkas || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">{item.nomor_item}</td>
                    <td className="px-4 py-3 text-sm text-center">{item.kode_klasifikasi}</td>
                    <td className="px-4 py-3 text-sm text-left max-w-xs truncate" title={item.uraian_informasi}>{item.uraian_informasi}</td>
                    <td className="px-4 py-3 text-sm text-center">{item.kurun_waktu || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">{item.jumlah || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">{item.tingkat_perkembangan || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center">{item.media_simpan || '-'}</td>
                    <td className="px-4 py-3 text-sm text-left max-w-xs truncate" title={item.jangka_simpan || undefined}>{item.jangka_simpan || '-'}</td>
                    <td className="px-4 py-3 text-sm text-left max-w-xs truncate" title={item.keterangan || undefined}>{item.keterangan || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                        <Link href={`/arsip/arsip-aktif/detail-item/${item.id_isi_arsip}`} passHref>
                            <button
                                className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary group transition-all duration-150 ease-in-out"
                                title="Lihat Detail Item"
                                aria-label="Lihat Detail Item Isi Arsip"
                            >
                                <Eye size={18} className="transform group-hover:scale-110 transition-transform duration-150" />
                            </button>
                        </Link>
                        <button
                            onClick={() => handleDelete(item.id_isi_arsip, 'isiBerkas')}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-destructive group ml-2 transition-all duration-150 ease-in-out"
                            title="Hapus Item Isi Arsip"
                            aria-label="Hapus Item Isi Arsip"
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
              disabled={currentPage === 1 || dataLoading}
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
              disabled={currentPage === totalPages || dataLoading}
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
