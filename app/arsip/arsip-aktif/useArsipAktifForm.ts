"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { processPDF } from "@/utils/ocrService"; // Updated to use pdfOcrService
import { sendDepartmentHeadNotification } from "@/utils/notificationService";
import { BIDANG_CABINET_MAP, LACI_CAPACITY } from "./constants"; // Pastikan LACI_CAPACITY sudah di constants.ts
import * as pdfjs from 'pdfjs-dist'; 
import { debounce } from "lodash";

interface FormDataState {
  nomor_berkas: number; 
  file_url: string | null;
  kode_klasifikasi: string;
  uraian_informasi: string;
  tanggal_penciptaan_mulai: string; 
  tanggal_penciptaan_berakhir: string; 
  tanggal_mulai: string;
  tanggal_berakhir: string;
  masa_retensi: string;
  kurun_waktu: string;
  jangka_simpan: string;
  jumlah: string;
  keterangan: string;
  tingkat_perkembangan: string;
  media_simpan: string;
}

if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;
}

interface CalculatedLocationState {
  no_filing_cabinet: string;
  no_laci: string;
  no_folder: string;
}

const SUPABASE_QUERY_TIMEOUT_MS = 15000; // 15 detik timeout untuk query Supabase

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

interface KlasifikasiItem {
  kode_klasifikasi: string;
  label: string;
}

export function useArsipAktifForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");

  const [authLoading, setAuthLoading] = useState(true);
  const ALLOWED_ROLE = "Pegawai";
  const SIGN_IN_PATH = "/sign-in";
  const DEFAULT_HOME_PATH = "/";

  const [formData, setFormData] = useState<FormDataState>({
    nomor_berkas: 0, 
    file_url: null, 
    kode_klasifikasi: "",
    uraian_informasi: "",
    tanggal_penciptaan_mulai: "",
    tanggal_penciptaan_berakhir: "",
    tanggal_mulai: "",
    tanggal_berakhir: "",
    masa_retensi: "",
    kurun_waktu: "",
    jangka_simpan: "", // Inisialisasi
    jumlah: "",
    keterangan: "",
    tingkat_perkembangan: "",
    media_simpan: "",
  });

  // State untuk file PDF dan preview
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nomorBerkas, setNomorBerkas] = useState<number>(0);
  const [userNamaBidang, setUserNamaBidang] = useState<string | null>(null);
  const [userIdBidang, setUserIdBidang] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // State untuk menyimpan ID pengguna aktual

  const [selectedKodeDasar, setSelectedKodeDasar] = useState("");
  const [kodeTambahan, setKodeTambahan] = useState("");
  const [klasifikasiList, setKlasifikasiList] = useState<KlasifikasiItem[]>([]);
  const [kodeKlasifikasiMode, setKodeKlasifikasiMode] = useState<'otomatis' | 'manual'>('manual'); // Default ke manual
  const [calculatedLocation, setCalculatedLocation] = useState<CalculatedLocationState>({
    no_filing_cabinet: "",
    no_laci: "",
    no_folder: "",
  });

  const resetFormForNewEntry = () => {
    setFormData({
      nomor_berkas: 0, // Akan diupdate oleh useEffect yang menyinkronkan dengan state nomorBerkas
      file_url: null,
      kode_klasifikasi: "",
      uraian_informasi: "",
      tanggal_penciptaan_mulai: "",
      tanggal_penciptaan_berakhir: "",
      tanggal_mulai: "",
      tanggal_berakhir: "",
      masa_retensi: "",
      kurun_waktu: "",
      jangka_simpan: "",
      jumlah: "",
      keterangan: "",
      tingkat_perkembangan: "",
      media_simpan: "",
    });
    setPdfFile(null);
    setPdfPreviewUrl(null);
    setSelectedKodeDasar("");
    setKodeTambahan("");
    setKodeKlasifikasiMode('manual'); // Kembali ke mode default
    // calculatedLocation akan dihitung ulang oleh useEffect-nya sendiri
  };

  // Helper function to parse "DD-MM-YYYY s.d. DD-MM-YYYY" or "DD-MM-YYYY" into start and end dates
  const parseDateRangeString = (dateStr: string | null | undefined): { startDate: string | null, endDate: string | null } => {
    if (!dateStr) {
      return { startDate: null, endDate: null };
    }

    const parts = dateStr.split(" s.d. ");
    const formatDateToYyyyMmDd = (dmyDate: string): string | null => {
      if (!dmyDate || dmyDate.trim() === "") return null;
      const [day, month, year] = dmyDate.split("-");
      if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
        return `${year}-${month}-${day}`;
      }
      return null; // Invalid format
    };

    const startDate = formatDateToYyyyMmDd(parts[0]);
    const endDate = parts.length > 1 ? formatDateToYyyyMmDd(parts[1]) : null;
    return { startDate, endDate };
  };
  const loadArchiveDataForEdit = useCallback(async (id: string) => {
    setAuthLoading(true);
    console.log("Loading archive data for edit, ID:", id);
    const { data, error } = await supabase
      .from("arsip_aktif")
      .select(`*, lokasi_penyimpanan:id_lokasi_fkey(*)`)
      .eq("id_arsip_aktif", id)
      .single();

    if (error || !data) {
      console.error("Error fetching archive data for edit:", error);
      toast.error("Gagal memuat data arsip untuk diedit.");
      router.push("/arsip/arsip-aktif/daftar-aktif");
      setAuthLoading(false);
      return;
    }

    console.log("Archive data loaded for edit:", data);

    // Set kode klasifikasi mode based on how it's structured or a saved preference if any
    // For now, assume 'otomatis' if it contains '/', 'manual' otherwise, or default to 'otomatis'
    const currentKodeKlasifikasi = data.kode_klasifikasi || "";
    const newMode = currentKodeKlasifikasi.includes('/') ? 'otomatis' : 'manual';
    // setKodeKlasifikasiMode(newMode); // Decide if you want to auto-switch mode on edit load

    // Parse kurun_waktu and jangka_simpan to populate individual date fields
    const parsedKurunWaktu = parseDateRangeString(data.kurun_waktu);
    const parsedJangkaSimpan = parseDateRangeString((data as any).jangka_simpan);

    setFormData({
      nomor_berkas: data.nomor_berkas || 0, // Ensure nomor_berkas is a number
      file_url: data.file_url || null, // Muat file_url saat edit
      kode_klasifikasi: data.kode_klasifikasi || "",
      uraian_informasi: data.uraian_informasi || "",
      tanggal_penciptaan_mulai: parsedKurunWaktu.startDate || "",
      tanggal_penciptaan_berakhir: parsedKurunWaktu.endDate || "",
      tanggal_mulai: parsedJangkaSimpan.startDate || "", // Ini akan dihitung ulang oleh useEffect juga
      tanggal_berakhir: parsedJangkaSimpan.endDate || "", // Ini akan dihitung ulang oleh useEffect juga
      masa_retensi: data.masa_retensi?.toString() || "",
      // kurun_waktu dan jangka_simpan akan di-set ulang oleh useEffect berdasarkan tanggal_penciptaan_mulai/akhir dan tanggal_mulai/akhir
      kurun_waktu: data.kurun_waktu || "", // Tetap muat nilai asli untuk referensi awal
      jangka_simpan: (data as any).jangka_simpan || "", // Muat jangka_simpan jika ada
      jumlah: data.jumlah?.toString() || "",
      keterangan: data.keterangan || "",
      tingkat_perkembangan: data.tingkat_perkembangan || "",
      media_simpan: data.media_simpan || "",
    });

    // Populate selectedKodeDasar and kodeTambahan based on the current mode
    // This ensures that if the mode is 'otomatis', these fields are pre-filled for the UI
    // if (kodeKlasifikasiMode === 'otomatis') { // Or newMode if you auto-switch
      const [kodeDasar, ...kodeTambahanArray] = currentKodeKlasifikasi.split("/");
      setSelectedKodeDasar(kodeDasar || "");
      setKodeTambahan(kodeTambahanArray.join("/") || "");
    // }
    if (data.file_url) {
      setPdfPreviewUrl(data.file_url);
      // Tidak bisa langsung mengatur pdfFile dari URL, hanya set previewUrl
    }
    // setNomorBerkas(data.nomor_berkas); // nomorBerkas dari state hook akan tetap sebagai referensi, formData yang utama untuk UI edit
    // Jika ingin nomorBerkas di state hook juga update saat edit, bisa di-set di sini.
  }, [supabase, router]);
  useEffect(() => {
    const checkAuthAndFetchInitialData = async () => {
      setAuthLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push(SIGN_IN_PATH);
        return;
      }

      const userId = session.user.id;
      setCurrentUserId(userId); // Simpan ID pengguna aktual
      let userRole: string | null = null;

      try {
        const { data: userData, error: userFetchError } = await supabase
          .from("users")
          .select("role, id_bidang_fkey, daftar_bidang:id_bidang_fkey ( nama_bidang )")
          .eq("user_id", userId)
          .single();

        if (userFetchError) {
          toast.error("Gagal memverifikasi data pengguna.");
          router.push(SIGN_IN_PATH);
          setAuthLoading(false);
          return;
        }

        if (!userData || !userData.role || !userData.daftar_bidang || typeof userData.daftar_bidang !== 'object' || !('nama_bidang' in userData.daftar_bidang) || !userData.daftar_bidang.nama_bidang) {
          toast.warn("Data pengguna (peran/bidang) tidak lengkap. Silakan login kembali.");
          router.push(SIGN_IN_PATH);
          setAuthLoading(false);
          return;
        }

        userRole = userData.role;
        if (userData.daftar_bidang && typeof userData.daftar_bidang === 'object' && 'nama_bidang' in userData.daftar_bidang) {
          setUserNamaBidang(userData.daftar_bidang.nama_bidang as string);
          setUserIdBidang(userData.id_bidang_fkey as number);
        }
      } catch (error: any) {
        toast.error("Terjadi kesalahan saat verifikasi peran.");
        router.push(SIGN_IN_PATH);
        setAuthLoading(false);
        return;
      }

      if (userRole !== ALLOWED_ROLE) {
        toast.warn("Anda tidak memiliki izin untuk mengakses halaman ini.");
        router.push(DEFAULT_HOME_PATH);
        setAuthLoading(false);
        return;
      }

      try {
        console.log("[AuthDebug] Fetching klasifikasi list...");
        const klasifikasiPromise = supabase
          .from("klasifikasi_arsip")
          .select("kode_klasifikasi, label");

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new TimeoutError(`Pengambilan daftar klasifikasi melebihi batas waktu ${SUPABASE_QUERY_TIMEOUT_MS}ms.`)), SUPABASE_QUERY_TIMEOUT_MS)
        );

        const result = await Promise.race([klasifikasiPromise, timeoutPromise]) as { data: KlasifikasiItem[] | null; error: any; };
        
        if (result.error) {
          console.error("[AuthDebug] Error fetching klasifikasi list:", result.error);
          toast.error(`Gagal memuat daftar klasifikasi: ${result.error.message}`);
          setKlasifikasiList([]);
        } else {
          setKlasifikasiList(result.data || []);
          console.log("[AuthDebug] Klasifikasi list fetched successfully.");
        }
      } catch (error) { // Catch for timeout specifically if it's not caught as result.error
        console.error("[AuthDebug] Exception during klasifikasi list fetch (likely timeout):", error);
        toast.error(`Gagal memuat daftar klasifikasi: ${(error as Error).message}`);
        setKlasifikasiList([]);
      }
      if (editId) {
        await loadArchiveDataForEdit(editId);
      }

      setAuthLoading(false);
    };

    checkAuthAndFetchInitialData();
  }, [router, supabase, editId, loadArchiveDataForEdit]);

  useEffect(() => {
    const fetchNextNomorBerkasForBidang = async () => {
      console.log("[NomorBerkasDebug] Triggered. authLoading:", authLoading, "userIdBidang:", userIdBidang, "editId:", editId);
      if (authLoading || !userIdBidang || editId) {
        console.log("[NomorBerkasDebug] Exiting early due to authLoading, !userIdBidang, or editId.");
        // Jika masih loading auth dan bukan mode edit, pastikan nomorBerkas direset ke 0 jika belum.
        if (authLoading && !editId && nomorBerkas !== 0) setNomorBerkas(0);
        return;
      }
      try {
        // Ambil daftar id arsip aktif yang sudah dipindahkan
        const { data: pemindahanLinks, error: pemindahanError } = await supabase
          .from('pemindahan_arsip_link')
          .select('id_arsip_aktif_fkey');
        if (pemindahanError) {
          toast.error("Gagal memuat data link pemindahan: " + pemindahanError.message);
          if (!editId) setNomorBerkas(1); // Default ke 1 hanya jika bukan mode edit
          return;
        }
        const idsToExclude = pemindahanLinks?.map(link => link.id_arsip_aktif_fkey).filter(id => id != null) || [];
    
        // Ambil arsip aktif yang BELUM DIPINDAHKAN untuk bidang ini
        let query = supabase
          .from("arsip_aktif")
          .select("nomor_berkas, lokasi_penyimpanan!inner(id_bidang_fkey), id_arsip_aktif")
          .eq("lokasi_penyimpanan.id_bidang_fkey", userIdBidang);
    
        if (idsToExclude.length > 0) {
          const idsToExcludeString = `(${idsToExclude.join(',')})`;
          query = query.not('id_arsip_aktif', 'in', idsToExcludeString);
        }
    
        // Urutkan nomor_berkas terbesar
        const { data, error } = await query
          .order("nomor_berkas", { ascending: false })
          .limit(1)
          .single();
    
        if (error && error.code !== 'PGRST116') {
          console.error(`[NomorBerkasDebug] Error fetching highest nomor_berkas (and not PGRST116) for bidang ${userIdBidang}:`, error);
          toast.error("Gagal mengambil nomor berkas berikutnya.");
          if (!editId) setNomorBerkas(1);
          return;
        }
    
        const lastNomorBerkas = data?.nomor_berkas || 0;
        if (!editId) setNomorBerkas(lastNomorBerkas + 1); // Hanya set untuk entri baru
      } catch (e) {
        console.error("[NomorBerkasDebug] Exception in fetchNextNomorBerkasForBidang:", e);
        toast.error("Terjadi kesalahan saat mengambil nomor berkas berikutnya.");
        if (!editId) setNomorBerkas(1);
      }
    };
    fetchNextNomorBerkasForBidang();
  }, [authLoading, userIdBidang, supabase, editId, nomorBerkas]); // Tambahkan authLoading dan nomorBerkas

  // Sinkronkan nomorBerkas otomatis dari hook ke formData.nomor_berkas HANYA jika bukan mode edit
  // dan formData.nomor_berkas belum diisi (atau belum diubah manual oleh pengguna)
  useEffect(() => {
    if (!editId && nomorBerkas > 0) { // Hanya untuk entri baru dan jika nomorBerkas otomatis ada
      console.log(`[NomorBerkasSyncDebug] Sync effect triggered. editId: ${editId}, nomorBerkas (state): ${nomorBerkas}`);
      setFormData(prev => {
        // If formData.nomor_berkas is 0 (initial/empty state), set it to the auto-generated one.
        if (prev.nomor_berkas === 0) {
          console.log(`[NomorBerkasSyncDebug] Syncing. Prev formData.nomor_berkas: ${prev.nomor_berkas}. Setting formData.nomor_berkas to ${nomorBerkas}`);
          return { ...prev, nomor_berkas: nomorBerkas };
        }
        console.log(`[NomorBerkasSyncDebug] Not syncing. Prev formData.nomor_berkas: ${prev.nomor_berkas} (not 0). nomorBerkas (state): ${nomorBerkas}.`);
        return prev;
      });
    }
  }, [nomorBerkas, editId]);

  useEffect(() => {
    if (kodeKlasifikasiMode === 'otomatis') {
      const kodeLengkap = selectedKodeDasar + (kodeTambahan ? `/${kodeTambahan}` : "");
      setFormData(prev => {
        if (!selectedKodeDasar) {
          return prev;
        }
        if (prev.kode_klasifikasi !== kodeLengkap) {
          return { ...prev, kode_klasifikasi: kodeLengkap };
        }
        return prev;
      });
    }
    // If mode is 'manual', formData.kode_klasifikasi is updated directly via handleChange
  }, [selectedKodeDasar, kodeTambahan, kodeKlasifikasiMode]);

  // Menghitung tanggal_mulai (untuk JANGKA AKTIF) berdasarkan tanggal_penciptaan_mulai
  useEffect(() => {
    if (formData.tanggal_penciptaan_mulai) {
      const tglCiptaMulai = new Date(formData.tanggal_penciptaan_mulai);
      if (!isNaN(tglCiptaMulai.getTime())) {
        const tahunCiptaMulai = tglCiptaMulai.getFullYear();
        // Tanggal mulai jangka aktif adalah 1 Januari tahun BERIKUTNYA dari tahun cipta mulai
        const tanggalMulaiAktif = new Date(tahunCiptaMulai + 1, 0, 1); // Bulan 0 adalah Januari
        
        // Format tanggalMulaiAktif ke YYYY-MM-DD tanpa konversi timezone oleh toISOString()
        const year = tanggalMulaiAktif.getFullYear();
        const month = (tanggalMulaiAktif.getMonth() + 1).toString().padStart(2, '0');
        const day = tanggalMulaiAktif.getDate().toString().padStart(2, '0');
        const tanggalMulaiAktifStr = `${year}-${month}-${day}`;
        
        setFormData(prev => {
          if (prev.tanggal_mulai !== tanggalMulaiAktifStr) {
            return { ...prev, tanggal_mulai: tanggalMulaiAktifStr };
          }
          return prev;
        });
      }
    } else {
      // Jika tanggal_penciptaan_mulai kosong, kosongkan juga tanggal_mulai
      setFormData(prev => {
        if (prev.tanggal_mulai !== "") {
          return { ...prev, tanggal_mulai: "" };
        }
        return prev;
      });
    }
  }, [formData.tanggal_penciptaan_mulai]);

  // Menyesuaikan tanggal_penciptaan_berakhir agar sama dengan tanggal_penciptaan_mulai
  // ketika tanggal_penciptaan_mulai diisi/diubah, untuk kemudahan input.
  useEffect(() => {
    if (formData.tanggal_penciptaan_mulai) {
      setFormData(prev => {
        // Hanya update jika tanggal_penciptaan_berakhir kosong atau berbeda
        // Ini memungkinkan pengguna untuk tetap mengubahnya manual jika diperlukan
        if (prev.tanggal_penciptaan_berakhir !== formData.tanggal_penciptaan_mulai) {
          return { ...prev, tanggal_penciptaan_berakhir: formData.tanggal_penciptaan_mulai };
        }
        return prev;
      });
    }
  }, [formData.tanggal_penciptaan_mulai]);

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Menghitung kurun_waktu (PERIODE PENCIPTAAN ARSIP) menjadi string "DD-MM-YYYY s.d. DD-MM-YYYY"
  useEffect(() => {
    if (formData.tanggal_penciptaan_mulai) {
      const tglMulaiCipta = new Date(formData.tanggal_penciptaan_mulai);
      let kurunWaktuCiptaStr = formatDate(tglMulaiCipta);

      if (formData.tanggal_penciptaan_berakhir) {
        const tglAkhirCipta = new Date(formData.tanggal_penciptaan_berakhir);
        if (!isNaN(tglAkhirCipta.getTime())) {
          kurunWaktuCiptaStr += ` s.d. ${formatDate(tglAkhirCipta)}`;
        }
      }
      setFormData(prev => {
        if (prev.kurun_waktu !== kurunWaktuCiptaStr) {
          return { ...prev, kurun_waktu: kurunWaktuCiptaStr };
        }
        return prev;
      });
    }
  }, [formData.tanggal_penciptaan_mulai, formData.tanggal_penciptaan_berakhir]);

  // Menghitung tanggal_berakhir (JANGKA AKTIF) dan jangka_simpan (string periode JANGKA AKTIF)
  // berdasarkan formData.tanggal_mulai (yang dihitung di atas) dan formData.masa_retensi
  useEffect(() => {
    if (formData.tanggal_mulai) {
      const tanggalMulai = new Date(formData.tanggal_mulai);
      if (!isNaN(tanggalMulai.getTime())) {
        let tanggalBerakhir: Date;
        const masaRetensiNum = parseInt(formData.masa_retensi);

        if (formData.masa_retensi && !isNaN(masaRetensiNum) && masaRetensiNum > 0) {
          const tahunBerakhir = tanggalMulai.getFullYear() + masaRetensiNum - 1;
          tanggalBerakhir = new Date(tahunBerakhir, 11, 31);
        } else {
          const tahunMulai = tanggalMulai.getFullYear();
          tanggalBerakhir = new Date(tahunMulai, 11, 31);
        }

        const tanggalBerakhirStr = tanggalBerakhir.toISOString().split('T')[0];
        const tanggalMulaiFormatted = formatDate(tanggalMulai);
        const tanggalBerakhirFormatted = formatDate(tanggalBerakhir);
        const jangkaSimpanStr = `${tanggalMulaiFormatted} s.d. ${tanggalBerakhirFormatted}`;

        setFormData(prev => {
          if (prev.tanggal_berakhir !== tanggalBerakhirStr || prev.jangka_simpan !== jangkaSimpanStr) {
            return { ...prev, tanggal_berakhir: tanggalBerakhirStr, jangka_simpan: jangkaSimpanStr };
          }
          return prev;
        });
      }
    } else {
      setFormData(prev => {
        if (prev.tanggal_berakhir !== "" || prev.jangka_simpan !== "") {
          return { ...prev, tanggal_berakhir: "", jangka_simpan: "" };
        }
        return prev;
      });
    }
  }, [formData.tanggal_mulai, formData.masa_retensi]);

  useEffect(() => {
    const fetchRetensiData = async () => {
      if (kodeKlasifikasiMode === 'otomatis') {
        console.log("[Retensi Debug] Hook terpicu (mode otomatis). selectedKodeDasar saat ini:", selectedKodeDasar);
        if (!selectedKodeDasar) {
          console.log("[Retensi Debug] selectedKodeDasar kosong, mereset masa_retensi.");
          setFormData(prev => {
            if (prev.masa_retensi !== "") {
              console.log("[Retensi Debug] Mereset formData.masa_retensi menjadi string kosong.");
              return { ...prev, masa_retensi: "" };
            }
            return prev;
          });
          return;
        }
        try {
          console.log(`[Retensi Debug] Mencoba mengambil retensi untuk kode: '${selectedKodeDasar}'`);
          const { data, error, status } = await supabase
            .from("klasifikasi_arsip")
            .select("aktif")
            .eq("kode_klasifikasi", selectedKodeDasar)
            .single();

          if (error) {
            console.error(`[Retensi Debug] Error dari Supabase (status: ${status}):`, error.message);
            setFormData(prev => prev.masa_retensi !== "" ? { ...prev, masa_retensi: "" } : prev); // Reset on error
            return;
          }
          
          if (!data) {
            console.log(`[Retensi Debug] Tidak ada data retensi ditemukan di DB untuk kode: '${selectedKodeDasar}'`);
            setFormData(prev => prev.masa_retensi !== "" ? { ...prev, masa_retensi: "" } : prev); // Reset if no data
            return;
          }
          console.log("[Retensi Debug] Data retensi berhasil diambil dari DB:", data);
          const newMasaRetensi = data.aktif.toString();
          setFormData(prev => {
            if (prev.masa_retensi !== newMasaRetensi) {
              console.log(`[Retensi Debug] Mengatur formData.masa_retensi ke: '${newMasaRetensi}' (sebelumnya: '${prev.masa_retensi}')`);
              return { ...prev, masa_retensi: newMasaRetensi };
            }
            console.log(`[Retensi Debug] formData.masa_retensi sudah '${newMasaRetensi}', tidak ada perubahan.`);
            return prev;
          });
        } catch (error) {
          console.error("[Retensi Debug] Exception di fetchRetensiData:", error);
          setFormData(prev => prev.masa_retensi !== "" ? { ...prev, masa_retensi: "" } : prev); // Reset on exception
        }
      } else { // mode manual
        // In manual mode, masa_retensi is user-input, so no fetching.
        // If you want to clear it when switching to manual, you can add logic here.
        // For now, it retains its value.
        console.log("[Retensi Debug] Mode manual, tidak ada fetch retensi otomatis.");
      }
    };
    fetchRetensiData();
  }, [selectedKodeDasar, supabase, kodeKlasifikasiMode]);

  useEffect(() => {
    const determineLocation = async () => {
      console.log("[LocationDebug] Triggered. authLoading:", authLoading, "userNamaBidang:", userNamaBidang);
      if (authLoading || !userNamaBidang) {
        // Hanya set jika nilai berbeda untuk menghindari loop render yang tidak perlu
        if (calculatedLocation.no_filing_cabinet !== "" || calculatedLocation.no_laci !== "" || calculatedLocation.no_folder !== "") {
          setCalculatedLocation({ no_filing_cabinet: "", no_laci: "", no_folder: "" });
        }
        return;
      }
      const cabinetPrefix = BIDANG_CABINET_MAP[userNamaBidang];
      if (!cabinetPrefix) {
        setCalculatedLocation({ no_filing_cabinet: "", no_laci: "", no_folder: "" });
        return;
      }

      // Dapatkan kode klasifikasi yang akan digunakan untuk pencarian folder
      let kodeKlasifikasiFinal = "";
      if (kodeKlasifikasiMode === 'otomatis' && selectedKodeDasar) {
        kodeKlasifikasiFinal = selectedKodeDasar;
      } else if (kodeKlasifikasiMode === 'manual' && formData.kode_klasifikasi) {
        kodeKlasifikasiFinal = formData.kode_klasifikasi.split('/')[0].trim() || formData.kode_klasifikasi.trim();
      }

      // Hitung jumlah arsip aktif (belum dipindahkan) di bidang & kode klasifikasi ini
      let jumlahArsip = 0;
      let noLaci = "1";
      let noFolder = "1";

      if (kodeKlasifikasiFinal && userIdBidang) {
        // Ambil daftar id arsip aktif yang sudah dipindahkan
        const { data: pemindahanLinks } = await supabase
          .from('pemindahan_arsip_link')
          .select('id_arsip_aktif_fkey');
        const idsToExclude = pemindahanLinks?.map(link => link.id_arsip_aktif_fkey).filter(id => id != null) || [];

        // Hitung jumlah arsip aktif pada bidang & kode klasifikasi ini
        let query = supabase
          .from("arsip_aktif")
          .select("id_arsip_aktif, kode_klasifikasi, lokasi_penyimpanan!inner(id_bidang_fkey)")
          .eq("lokasi_penyimpanan.id_bidang_fkey", userIdBidang)
          .ilike("kode_klasifikasi", `${kodeKlasifikasiFinal}%`);

        if (idsToExclude.length > 0) {
          const idsToExcludeString = `(${idsToExclude.join(',')})`;
          query = query.not('id_arsip_aktif', 'in', idsToExcludeString);
        }

        const { data: arsipList } = await query;
        jumlahArsip = arsipList ? arsipList.length : 0;

        // Tentukan laci ke berapa (1-4)
        noLaci = (Math.floor(jumlahArsip / LACI_CAPACITY) + 1).toString();
        if (parseInt(noLaci) > 4) noLaci = "4";
        
        // Tentukan nomor folder berdasarkan urutan kode klasifikasi utama di laci yang sama
        if (kodeKlasifikasiFinal) { // kodeKlasifikasiFinal adalah kode utama dari arsip saat ini
          let arsipInLaciQuery = supabase
            .from("arsip_aktif")
            .select("id_arsip_aktif, kode_klasifikasi, lokasi_penyimpanan!inner(id_lokasi, no_laci, id_bidang_fkey)")
            .eq("lokasi_penyimpanan.id_bidang_fkey", userIdBidang)
            .eq("lokasi_penyimpanan.no_laci", noLaci);

          if (idsToExclude.length > 0) { // idsToExclude dari arsip yang sudah dipindahkan
            const idsToExcludeString = `(${idsToExclude.join(',')})`;
            arsipInLaciQuery = arsipInLaciQuery.not('id_arsip_aktif', 'in', idsToExcludeString);
          }

          const { data: arsipInLaciList, error: arsipError } = await arsipInLaciQuery;

          if (arsipError) {
            console.error("[LocationDebug] Error fetching arsip in laci for folder calculation:", arsipError);
            // Biarkan noFolder menggunakan default "1" jika terjadi error
          } else {
            const allKlasifikasiUtamaInLaci = new Set<string>();
            if (arsipInLaciList) {
              arsipInLaciList.forEach(arsip => {
                // Jika mode edit dan ini adalah arsip yang sedang diedit,
                // jangan masukkan kode klasifikasi lamanya dari DB jika kode klasifikasi di form (kodeKlasifikasiFinal) berbeda.
                // kodeKlasifikasiFinal (dari form) akan ditambahkan secara eksplisit di bawah.
                if (editId && arsip.id_arsip_aktif === editId) {
                  // Lewati, akan diurus oleh penambahan kodeKlasifikasiFinal
                } else {
                  allKlasifikasiUtamaInLaci.add(arsip.kode_klasifikasi.split('/')[0].trim());
                }
              });
            }
            
            // Tambahkan kode klasifikasi utama dari form saat ini.
            // Ini menangani entri baru, atau entri yang diedit (menggunakan nilai kode terbaru dari form).
            allKlasifikasiUtamaInLaci.add(kodeKlasifikasiFinal);

            if (allKlasifikasiUtamaInLaci.size > 0) {
              const sortedKlasifikasiUtama = Array.from(allKlasifikasiUtamaInLaci).sort();
              const folderIndex = sortedKlasifikasiUtama.indexOf(kodeKlasifikasiFinal);
              if (folderIndex !== -1) {
                noFolder = (folderIndex + 1).toString();
              }
            }
          }
        }
      }

      if (
        calculatedLocation.no_filing_cabinet !== cabinetPrefix ||
        calculatedLocation.no_laci !== noLaci ||
        calculatedLocation.no_folder !== noFolder
      ) {
        setCalculatedLocation({
          no_filing_cabinet: cabinetPrefix,
          no_laci: noLaci,
          no_folder: noFolder,
        });
      }
    };
    determineLocation();
    // depend on userNamaBidang, selectedKodeDasar, kodeKlasifikasiMode, formData.kode_klasifikasi, userIdBidang, supabase
  }, [authLoading, userNamaBidang, selectedKodeDasar, kodeKlasifikasiMode, formData.kode_klasifikasi, userIdBidang, supabase, calculatedLocation.no_filing_cabinet, calculatedLocation.no_laci, calculatedLocation.no_folder]); // Tambahkan authLoading dan bagian dari calculatedLocation

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "nomor_berkas") {
      // For number inputs, value can be empty string if user deletes content.
      // Treat empty string as 0 for our numeric state.
      const numericValue = value === "" ? 0 : parseInt(value, 10);
      // Avoid NaN if parseInt fails (e.g., user types non-numeric chars in a text input not of type="number")
      setFormData(prev => ({ ...prev, nomor_berkas: isNaN(numericValue) ? prev.nomor_berkas : numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleKodeDasarChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedKodeDasar(e.target.value);
  };

  const handleKodeTambahanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKodeTambahan(e.target.value);
  };

  // Handler untuk upload PDF
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validasi tipe file
      if (file.type !== 'application/pdf') {
        toast.error('Hanya file PDF yang diizinkan.');
        return;
      }

      setPdfFile(file);
      // Buat URL untuk preview PDF
      const fileUrl = URL.createObjectURL(file);
      setPdfPreviewUrl(fileUrl);

      // Baca jumlah halaman PDF
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          try {
            const loadingTask = pdfjs.getDocument({ data: event.target.result as ArrayBuffer });
            const pdfDoc = await loadingTask.promise;
            const pageCount = pdfDoc.numPages;
            setFormData(prev => ({ ...prev, jumlah: pageCount.toString() }));
            toast.info(`Jumlah halaman PDF terdeteksi: ${pageCount} halaman.`);
          } catch (err) {
            console.error("Gagal membaca jumlah halaman PDF:", err);
            toast.error("Gagal membaca jumlah halaman PDF. Harap isi manual.");
            setFormData(prev => ({ ...prev, jumlah: "" }));
          }
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };
  
const handleExtractPdf = async () => {
  if (!pdfFile) {
    toast.warning("Silakan unggah file PDF terlebih dahulu.");
    return;
  }

  setOcrLoading(true);
  try {
    const extractedData = await processPDF(
      pdfFile,
      () => setOcrLoading(true),
      () => setOcrLoading(false)
    );

    // 1. Set kode klasifikasi dari OCR ke formData (karena mode default adalah manual)
    const kodeOcr = extractedData.kode_klasifikasi || "";
    console.log(`[OCR Log] Kode dari OCR: '${kodeOcr}'`);
    // Set kode OCR asli ke form dulu, akan diupdate jika ditemukan padanan di DB
    setFormData(prev => ({ ...prev, kode_klasifikasi: kodeOcr, masa_retensi: "" })); 

    if (kodeOcr) {
      // Kirim kode OCR penuh ke findKlasifikasiData,
      // findKlasifikasiData akan menangani trimming untuk pencarian.
      console.log(`[OCR Log] Mencari data klasifikasi untuk kode OCR penuh '${kodeOcr}'...`);
      const klasifikasiInfo = await findKlasifikasiData(supabase, kodeOcr);

      if (klasifikasiInfo) {
        const newBaseCodeFromDb = klasifikasiInfo.kode_klasifikasi; // Ini adalah kode dasar BARU dari DB
        const originalOcrBaseCode = kodeOcr.split('/')[0].trim(); // Bagian dasar dari kode OCR asli
        let originalOcrSuffix = "";

        // Ekstrak sufiks dari kode OCR asli, jika ada
        if (kodeOcr.includes('/') && kodeOcr.length > originalOcrBaseCode.length) {
          // Sufiks dimulai setelah originalOcrBaseCode
          originalOcrSuffix = kodeOcr.substring(originalOcrBaseCode.length); 
        }

        const reconstructedFullCode = newBaseCodeFromDb + originalOcrSuffix;

        console.log(`[OCR Log] Data klasifikasi ditemukan. Kode OCR asli: '${kodeOcr}', Kode dasar OCR: '${originalOcrBaseCode}', Suffix OCR: '${originalOcrSuffix}', Kode dasar baru dari DB: '${newBaseCodeFromDb}', Kode direkonstruksi: '${reconstructedFullCode}', Retensi Aktif: ${klasifikasiInfo.aktif}`);
        
        setFormData(prev => ({
          ...prev,
          kode_klasifikasi: reconstructedFullCode, // Gunakan kode yang sudah direkonstruksi
          masa_retensi: klasifikasiInfo.aktif?.toString() || "",
        }));
        
        setKodeKlasifikasiMode('otomatis');
        setSelectedKodeDasar(newBaseCodeFromDb); // Atur kode dasar baru untuk dropdown

        // Atur kodeTambahan dari originalOcrSuffix (hapus '/' di awal jika perlu)
        const suffixForKodeTambahan = originalOcrSuffix.startsWith('/') ? originalOcrSuffix.substring(1) : originalOcrSuffix;
        setKodeTambahan(suffixForKodeTambahan);
        
      } else {
        console.log(`[OCR Log] Tidak ada data klasifikasi ditemukan untuk kode OCR '${kodeOcr}'. Kode di form akan tetap seperti hasil OCR asli.`);
        // formData.kode_klasifikasi sudah diisi dengan kodeOcr
        // formData.masa_retensi sudah direset
        // Mode tetap manual (karena defaultnya manual dan tidak ada yang mengubahnya)
      }
    } else {
      console.log("[OCR Log] OCR tidak menghasilkan kode klasifikasi.");
      // formData.kode_klasifikasi akan kosong, masa_retensi kosong.
    }

    // Memperbarui uraian informasi dari hasil OCR
    if (extractedData.uraian_informasi) {
      setFormData(prev => ({
        ...prev,
        uraian_informasi: extractedData.uraian_informasi
      }));
    }

    // Mengelola tanggal dokumen dan saran tanggal mulai
    if (extractedData.tanggal_mulai_suggested) {
      const suggestedDate: string = extractedData.tanggal_mulai_suggested;
      // tanggal_mulai_suggested dari OCR sekarang mengisi tanggal_penciptaan_mulai
      setFormData(prev => ({
        ...prev,
        tanggal_penciptaan_mulai: suggestedDate 
      }));
    }

  } catch (error) {
    console.error("Error saat ekstraksi PDF:", error);
    toast.error("Gagal mengekstrak data dari PDF.");
  } finally {
    setOcrLoading(false);
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    console.log("[SubmitDebug] Proses handleSubmit dimulai.");

    try {
      let kodeLengkap = "";
      if (kodeKlasifikasiMode === 'otomatis') {
        kodeLengkap = selectedKodeDasar + (kodeTambahan ? `/${kodeTambahan}` : "");
        console.log(`[SubmitDebug] Mode Otomatis. Kode Lengkap Awal: '${kodeLengkap}', Kode Dasar: '${selectedKodeDasar}', Kode Tambahan: '${kodeTambahan}'`);
      } else {
        kodeLengkap = formData.kode_klasifikasi;
        console.log(`[SubmitDebug] Mode Manual. Kode Lengkap Awal: '${kodeLengkap}'`);
      }

      let retensiAktif = formData.masa_retensi;
      let retensiInaktif = "0"; // Default
      let nasibAkhir = "Permanen"; // Default

      if (kodeKlasifikasiMode === 'otomatis') {
        if (!selectedKodeDasar) {
          toast.error("Kode Klasifikasi Dasar harus dipilih dalam mode otomatis.");
          setSubmitting(false);
          console.error("[SubmitDebug] Error: Kode Klasifikasi Dasar kosong di mode otomatis.");
          return;
        }
        // Karena formData.masa_retensi (untuk retensiAktif) sudah diisi oleh useEffect saat selectedKodeDasar berubah,
        // kita tidak perlu mengambil ulang di sini untuk mode otomatis jika ingin menghindari timeout.
        // retensiAktif akan menggunakan nilai dari formData.masa_retensi (lihat inisialisasi variabel retensiAktif di atas).
        // retensiInaktif dan nasibAkhir akan menggunakan nilai default yang sudah diinisialisasi ("0" dan "Permanen").
        console.log(`[SubmitDebug] Mode Otomatis. Menggunakan retensi aktif dari form: '${retensiAktif}', Inaktif default: '${retensiInaktif}', Nasib Akhir default: '${nasibAkhir}'.`);
      } else { // Mode Manual
        console.log(`[SubmitDebug] Mode Manual. Mencari retensi untuk kode: '${kodeLengkap}'`);
        // Jika mode manual, kodeLengkap adalah input pengguna.
        // Kita perlu mencoba mencari retensi berdasarkan kodeLengkap ini,
        // pertama sebagai kode baru, lalu sebagai kode lama.
        // findKlasifikasiData akan menangani trimming kodeLengkap untuk pencarian.
        const kodeLengkapDasar = kodeLengkap.split('/')[0].trim();
        console.log(`[Submit Log] Mode Manual. Mencari klasifikasi untuk kode input: '${kodeLengkap}' (dasar: '${kodeLengkapDasar}')`);
        const klasifikasiInfo = await findKlasifikasiData(supabase, kodeLengkap); // Kirim kode lengkap

        if (klasifikasiInfo) {
            console.log(`[SubmitDebug] Mode Manual. Info klasifikasi ditemukan:`, klasifikasiInfo);
            retensiAktif = klasifikasiInfo.aktif?.toString() || formData.masa_retensi;
            retensiInaktif = klasifikasiInfo.inaktif?.toString() || "0";
            nasibAkhir = klasifikasiInfo.nasib_akhir || "Permanen";
            // Penting: kode_klasifikasi yang disimpan harus yang BARU dan LENGKAP dari DB
            kodeLengkap = klasifikasiInfo.kode_klasifikasi; // Update kodeLengkap dengan kode BARU yang sesuai
            if (formData.kode_klasifikasi !== kodeLengkap) {
              setFormData(prev => ({...prev, kode_klasifikasi: kodeLengkap}));
            } 
          } else {
            toast.warn(`Retensi untuk kode klasifikasi manual '${kodeLengkap}' tidak ditemukan. Menggunakan nilai input manual untuk retensi."`);
            console.warn(`[SubmitDebug] Mode Manual. Retensi untuk kode '${kodeLengkap}' tidak ditemukan.`);
            // retensiAktif sudah diisi dari formData.masa_retensi
        }
      }
      console.log(`[SubmitDebug] Retensi Final: Aktif='${retensiAktif}', Inaktif='${retensiInaktif}', Nasib Akhir='${nasibAkhir}'`);

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        toast.warning("Anda harus login untuk menyimpan arsip.");
        setSubmitting(false);
        console.error("[SubmitDebug] Error: User ID tidak ditemukan. Pengguna belum login.");
        return;
      }

      const { data: currentUserData, error: currentUserError } = await supabase
        .from("users")
        .select("id_bidang_fkey")
        .eq("user_id", userId)
        .single();

      if (currentUserError || !currentUserData || currentUserData.id_bidang_fkey === null) {
        toast.error("Gagal mendapatkan informasi bidang pengguna untuk penyimpanan lokasi.");
        console.error("[SubmitDebug] Error: Gagal mendapatkan id_bidang_fkey pengguna. Error:", currentUserError, "Data:", currentUserData);
        setSubmitting(false);
        return;
      }

      if (!userNamaBidang || !currentUserData.id_bidang_fkey) {
        toast.error("Data bidang pengguna tidak tersedia untuk notifikasi.");
        console.error("[SubmitDebug] Error: userNamaBidang atau id_bidang_fkey tidak tersedia.");
        setSubmitting(false);
        return;
      }

      // Upload file jika ada
      let fileUrl = '';
      console.log("[SubmitDebug] Memeriksa file PDF untuk diunggah...");
      if (pdfFile) {
        const fileExt = pdfFile.name.split('.').pop();
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
        const kodeKlasifikasiFormatted = kodeLengkap.replace(/\//g, '-');
        const fileName = `${kodeKlasifikasiFormatted}_${timestamp}.${fileExt}`;
        const filePath = `arsip_aktif/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('arsip').upload(filePath, pdfFile);
        console.log(`[SubmitDebug] Mencoba unggah file: '${fileName}' ke path: '${filePath}'`);

        if (uploadError) {
          toast.warning('Gagal mengunggah file.');
          console.error("[SubmitDebug] Error: Gagal mengunggah file. Error:", uploadError);
          setSubmitting(false);
          return;
        }
        fileUrl = supabase.storage.from('arsip').getPublicUrl(filePath).data.publicUrl;
        console.log(`[SubmitDebug] File berhasil diunggah. URL: '${fileUrl}'`);
      } else if (editId && pdfPreviewUrl) {
        // Jika edit dan ada URL sebelumnya, gunakan URL tersebut
        fileUrl = pdfPreviewUrl;
        console.log(`[SubmitDebug] Mode Edit. Menggunakan file URL yang sudah ada: '${fileUrl}'`);
      } else {
        console.log("[SubmitDebug] Tidak ada file PDF baru untuk diunggah dan bukan mode edit dengan file lama.");
      }

      let idLokasiFkey: string | null = null;
      if (calculatedLocation.no_filing_cabinet && calculatedLocation.no_laci && calculatedLocation.no_folder && currentUserData.id_bidang_fkey) {
        console.log("[SubmitDebug] Memeriksa atau membuat entri lokasi penyimpanan:", calculatedLocation);
        const { data: existingLokasi, error: lokErr } = await supabase
          .from("lokasi_penyimpanan")
          .select("id_lokasi")
          .eq("id_bidang_fkey", currentUserData.id_bidang_fkey)
          .eq("no_filing_cabinet", calculatedLocation.no_filing_cabinet)
          .eq("no_laci", calculatedLocation.no_laci)
          .eq("no_folder", calculatedLocation.no_folder)
          .single();

        if (lokErr && lokErr.code !== 'PGRST116') {
          toast.error("Gagal memeriksa lokasi penyimpanan.");
          console.error("[SubmitDebug] Error: Gagal memeriksa lokasi penyimpanan. Error:", lokErr);
          setSubmitting(false);
          return;
        }

        if (existingLokasi) {
          idLokasiFkey = existingLokasi.id_lokasi;
          console.log(`[SubmitDebug] Lokasi penyimpanan sudah ada. ID: '${idLokasiFkey}'`);
        } else {
          const { data: newLokasi, error: insertLokErr } = await supabase
            .from("lokasi_penyimpanan")
            .insert({ id_bidang_fkey: currentUserData.id_bidang_fkey, ...calculatedLocation })
            .select("id_lokasi")
            .single();
          if (insertLokErr || !newLokasi) {
            toast.error("Gagal membuat entri lokasi baru.");
            console.error("[SubmitDebug] Error: Gagal membuat entri lokasi baru. Error:", insertLokErr);
            setSubmitting(false); return;
          }
          idLokasiFkey = newLokasi.id_lokasi;
          console.log(`[SubmitDebug] Entri lokasi baru berhasil dibuat. ID: '${idLokasiFkey}'`);
        }
      } else {
        console.log("[SubmitDebug] Data lokasi penyimpanan tidak lengkap atau id_bidang_fkey tidak ada, skip pembuatan/pencarian lokasi.");
      }

      let finalNomorBerkas: number;
      if (editId) {
        console.log(`[SubmitDebug] Mode Edit. Nomor Berkas dari form: ${formData.nomor_berkas}`);
        // For existing records, nomor_berkas should generally not be reset to an auto-sequence number.
        // If it's 0, it means user cleared it. This should ideally be caught by validation.
        if (formData.nomor_berkas === 0) {
          toast.error("Nomor Berkas tidak boleh kosong untuk arsip yang diedit.");
          console.error("[SubmitDebug] Error: Nomor Berkas kosong di mode edit.");
          setSubmitting(false);
          return;
        }
        finalNomorBerkas = formData.nomor_berkas;
      } else {
        // For new records, use formData if set (not 0), otherwise use auto-sequence.
        finalNomorBerkas = formData.nomor_berkas !== 0 ? formData.nomor_berkas : nomorBerkas;
        console.log(`[SubmitDebug] Mode Tambah Baru. Nomor Berkas dari form: ${formData.nomor_berkas}, Nomor Berkas otomatis: ${nomorBerkas}. Final: ${finalNomorBerkas}`);
      }

      const arsipDataToSave = {
        kode_klasifikasi: kodeLengkap,
        uraian_informasi: formData.uraian_informasi,
        // Individual date fields (tanggal_mulai, tanggal_berakhir, tgl_cipta_mulai, tgl_cipta_akhir)
        // are no longer saved directly. Only kurun_waktu and jangka_simpan (string representations).
        masa_retensi: formData.masa_retensi ? parseInt(formData.masa_retensi) : null,
        kurun_waktu: formData.kurun_waktu,
        jangka_simpan: formData.jangka_simpan, // Simpan jangka_simpan
        jumlah: formData.jumlah ? parseInt(formData.jumlah) : null,
        keterangan: formData.keterangan,
        tingkat_perkembangan: formData.tingkat_perkembangan,
        media_simpan: formData.media_simpan,
        file_url: fileUrl,
        user_id: userId,
        nomor_berkas: finalNomorBerkas,
        id_lokasi_fkey: idLokasiFkey,
        // Tambahkan kolom baru jika ada untuk mode manual (misal: retensi_inaktif_manual, nasib_akhir_manual)
        // Untuk sekarang, kita asumsikan struktur tabel sama, dan masa_retensi di form adalah masa_retensi_aktif
      };
      // Jika tabel DB menggunakan 'masa_retensi' untuk retensi aktif, dan 'retensiAktif' adalah nilai yang benar:
      arsipDataToSave.masa_retensi = parseInt(retensiAktif) || null;

      console.log("[SubmitDebug] Data yang akan disimpan:", JSON.stringify(arsipDataToSave, null, 2));

      // delete (arsipDataToSave as any).masa_retensi_aktif; // Hapus ini jika kolomnya tidak ada di DB

      if (editId) {
        const { error: updateError } = await supabase
          .from('arsip_aktif')
          .update(arsipDataToSave)
          .eq('id_arsip_aktif', editId);
        if (updateError) {
          console.error("[SubmitDebug] Error: Gagal memperbarui data arsip. Error:", updateError);
          toast.error('Gagal memperbarui data arsip.');
        } else {
          // Hapus draft pengguna saat ini setelah update sukses
          await supabase
            .from('draft_input_arsip')
            .delete()
            .eq('user_id', currentUserId); // Gunakan currentUserId
          toast.success('Arsip berhasil diperbarui!');
          console.log("[SubmitDebug] Arsip berhasil diperbarui. Draft dihapus.");
          router.push(`/arsip/arsip-aktif/detail/${editId}`);
        }
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from('arsip_aktif')
          .insert([arsipDataToSave])
          .select()
          .single();
        if (insertError) {
          console.error("[SubmitDebug] Error: Gagal menyimpan data arsip baru. Error:", insertError);
          toast.error('Gagal menyimpan data.');
        } else {
          // Hapus draft pengguna saat ini setelah insert sukses
          await supabase
            .from('draft_input_arsip')
            .delete()
            .eq('user_id', currentUserId); // Gunakan currentUserId
          toast.success(`Arsip dengan nomor berkas ${arsipDataToSave.nomor_berkas} berhasil disimpan!`);
          console.log(`[SubmitDebug] Arsip baru berhasil disimpan dengan nomor berkas ${arsipDataToSave.nomor_berkas}. Draft dihapus.`);
          
          setNomorBerkas(prev => prev + 1); // Siapkan nomor berkas untuk entri berikutnya
          resetFormForNewEntry(); // Bersihkan form

          const arsipId = insertedData?.id_arsip_aktif;
          if (arsipId) {
            console.log(`[SubmitDebug] Mencoba mengirim notifikasi untuk arsip ID: ${arsipId}`);
            try {
              await sendDepartmentHeadNotification(
                userIdBidang,
                "Permintaan Persetujuan Arsip Baru",
                `Arsip baru dengan kode klasifikasi ${kodeLengkap} telah ditambahkan dan menunggu persetujuan.`,
                "/unit-pengolah/verifikasi-arsip",
                "verifikasi arsip aktif",
              );
            } catch (notifError) {
              toast.warn("Arsip disimpan, tetapi notifikasi gagal dikirim.");
              console.warn("[SubmitDebug] Warning: Notifikasi gagal dikirim. Error:", notifError);
            }
          }
          // router.push("/arsip/arsip-aktif/daftar-aktif"); // Dihapus agar tetap di halaman form
        }
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan data.');
      console.error("[SubmitDebug] Exception di blok try-catch utama handleSubmit:", error);
    } finally {
      setSubmitting(false);
      console.log("[SubmitDebug] FINALLY block. Proses handleSubmit selesai. Submitting diatur ke false.");
    }
  };

  const handleCancelSubmit = () => {
    setSubmitting(false);
    toast.info("Proses penyimpanan dibatalkan.");
  };

  useEffect(() => {
    if (!currentUserId) return; // Gunakan currentUserId sebagai kondisi
    const saveDraft = debounce(async () => {
      // Jangan simpan draft jika dalam mode edit untuk mencegah data asli tertimpa oleh editan parsial sebagai draft
      if (editId) return;

      await supabase
        .from('draft_input_arsip')
        .upsert({
          user_id: currentUserId, // Simpan dengan currentUserId
          data: formData,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id' // Explicitly define the conflict target
        }
      );
      console.log("[DraftDebug] Draft saved for user:", currentUserId, "Data:", formData);
    }, 5000);
    saveDraft();
    return () => saveDraft.cancel();
  }, [formData, currentUserId, supabase, editId]); // Tambahkan currentUserId dan editId ke dependencies

  useEffect(() => {
    const loadDraft = async () => {
      if (!currentUserId || editId) return; // Jangan load draft jika dalam mode edit
      const { data, error } = await supabase
        .from('draft_input_arsip')
        .select('data')
        .eq('user_id', currentUserId)
        .maybeSingle(); // Ganti single() menjadi maybeSingle()
      if (data && data.data) {
        setFormData(data.data);
        toast.info("Draft pengisian arsip berhasil dimuat.");
      }
    };
    loadDraft();
  }, [currentUserId, editId, supabase]);

  return {
    editId,
    // nomorBerkas, // Kembalikan juga nomorBerkas dari state hook jika UI masih membutuhkannya secara terpisah
    formData,
    pdfFile,
    pdfPreviewUrl,
    ocrLoading,
    submitting,
    klasifikasiList,
    selectedKodeDasar,
    kodeTambahan,
    calculatedLocation,
    handleChange,
    handleKodeDasarChange,
    handleKodeTambahanChange,
    handlePdfUpload,
    handleExtractPdf,
    handleSubmit,
    handleCancelSubmit,
    router,
    kodeKlasifikasiMode,
    setKodeKlasifikasiMode,
    authLoading, // Pastikan authLoading dikembalikan
  };
}


// Helper function to find klasifikasi data, trying new code then old code
async function findKlasifikasiData(supabaseClient: any, kodeInput: string) {
  // Trim kodeInput untuk mendapatkan bagian dasar yang akan digunakan untuk query
  const kodeDasarInput = kodeInput.split('/')[0].trim();
  if (!kodeDasarInput) return null;
  
  console.log(`[findKlasifikasiData] Mencari dengan kode dasar: '${kodeDasarInput}'`);

  // 1. Try as new code
  let { data, error } = await supabaseClient
    .from("klasifikasi_arsip")
    .select("kode_klasifikasi, aktif, inaktif, nasib_akhir")
    .eq("kode_klasifikasi", kodeDasarInput) // Cari dengan kode dasar
    .single();

  if (!error && data) {
    console.log(`[findKlasifikasiData] Ditemukan sebagai kode baru: '${data.kode_klasifikasi}'`);
    return data; // Found as new code
  }

  // 2. If not found (or error other than no rows), try as old code
  console.log(`[findKlasifikasiData] Tidak ditemukan sebagai kode baru, mencoba mencari sebagai kode lama: '${kodeDasarInput}'`);
  ({ data, error } = await supabaseClient
    .from("klasifikasi_arsip")
    .select("kode_klasifikasi, aktif, inaktif, nasib_akhir") // Select the NEW code
    .eq("kode_klasifikasi_old", kodeDasarInput) // Cari dengan kode dasar di kolom old
    .limit(1) // Take the first match if multiple new codes map to one old code
    .single());

  if (!error && data) {
    console.log(`[findKlasifikasiData] Ditemukan sebagai kode lama. Kode baru yang sesuai: '${data.kode_klasifikasi}'`);
    return data; // Found as old code, 'data' now contains the corresponding NEW code and its retentions
  }
  return null; // Not found
}
