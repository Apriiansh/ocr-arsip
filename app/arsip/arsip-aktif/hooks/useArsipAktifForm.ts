"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { processPDF } from "@/utils/ocrService";
import { sendDepartmentHeadNotification } from "@/utils/notificationService";
import { usePdfUpload } from "./usePdfUpload";
import { useIsiArsipFormDraft } from "./useFormDraft";
import { UserProfile, useAuth } from "@/context/AuthContext"; 
import { IsiArsipFormData, BerkasIndukItem } from "../types"; 

const ARSIP_LAST_SELECTED_BERKAS_INDUK_ID_KEY = "arsipLastSelectedBerkasIndukId";

export function useArsipAktifForm(enabled: boolean, user: UserProfile | null = null) { 
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: isAuthLoading } = useAuth(); 
  const editId = searchParams.get("editId");

  const [formData, setFormData] = useState<IsiArsipFormData>({
    id_berkas_induk_fkey: null,
    nomor_item: "",
    file_url: null,
    kode_klasifikasi: "",
    uraian_informasi: "",
    tanggal_penciptaan_mulai: "",
    tanggal_mulai: "",
    tanggal_berakhir: "",
    masa_retensi: "",
    kurun_waktu: "",
    jangka_simpan: "",
    jumlah: "",
    keterangan: "-",
    tingkat_perkembangan: "",
    media_simpan: "",
  });

  const {
    pdfFile,
    pdfPreviewUrl,
    pageCount,
    handlePdfUpload,
    setPdfFile,
    setPdfPreviewUrl,
  } = usePdfUpload();

  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nomorItemSuffix, setNomorItemSuffix] = useState<number>(1); // Suffix for "X.Y"

  const [selectedBerkasIndukId, setSelectedBerkasIndukId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && !searchParams.get("editId")) { 
      return localStorage.getItem(ARSIP_LAST_SELECTED_BERKAS_INDUK_ID_KEY);
    }
    return null;
  });
  const [berkasIndukList, setBerkasIndukList] = useState<BerkasIndukItem[]>([]);

  const { loadDraft: loadIsiArsipDraft, saveDraft: saveIsiArsipDraft } = useIsiArsipFormDraft<IsiArsipFormData>(
    formData,
    user?.id || null,
    editId, 
    setFormData
  );

  const handleRefreshDraft = useCallback(async () => {
    if (user?.id && !editId) {
      await loadIsiArsipDraft();
    } else if (editId) {
      toast.info("Refresh draft tidak tersedia dalam mode edit.");
    } else {
      toast.warn("Pengguna tidak terautentikasi untuk memuat draft.");
    }
  }, [user, editId, loadIsiArsipDraft]);

  const resetFormForNewEntry = () => {
    setFormData({
      id_berkas_induk_fkey: selectedBerkasIndukId,
      nomor_item: "",
      file_url: null,
      kode_klasifikasi: "",
      uraian_informasi: "",
      tanggal_penciptaan_mulai: "",
      tanggal_mulai: "",
      tanggal_berakhir: "",
      masa_retensi: "",
      kurun_waktu: "",
      jangka_simpan: "",
      jumlah: "",
      keterangan: "-",
      tingkat_perkembangan: "",
      media_simpan: "",
    });
    setPdfFile(null);
    setPdfPreviewUrl(null);
  };

  const parseDateRangeString = (dateStr: string | null | undefined): { startDate: string | null, endDate: string | null } => {
    if (!dateStr) return { startDate: null, endDate: null };
    if (dateStr.includes(" s.d. ")) {
      const parts = dateStr.split(" s.d. ");
      const formatDateToYyyyMmDd = (dmyDate: string): string | null => {
        if (!dmyDate || dmyDate.trim() === "") return null;
        const [day, month, year] = dmyDate.split("-");
        if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
          return `${year}-${month}-${day}`;
        }
        return null;
      };
      const startDate = formatDateToYyyyMmDd(parts[0]);
      const endDate = parts.length > 1 ? formatDateToYyyyMmDd(parts[1]) : null;
      return { startDate, endDate };
    }

    const singleDateParts = dateStr.split("-");
    if (singleDateParts.length === 3 && singleDateParts[0].length === 2 && singleDateParts[1].length === 2 && singleDateParts[2].length === 4) {
      // It's likely DD-MM-YYYY
      return { startDate: `${singleDateParts[2]}-${singleDateParts[1]}-${singleDateParts[0]}`, endDate: null };
    }
    return { startDate: dateStr, endDate: null };
  };

  // Effect to handle authentication status and fetch initial data (klasifikasi, edit data)
useEffect(() => {
  if (!enabled) return;

  const loadArchiveDataForEdit = async (id: string, currentBerkasIndukList: BerkasIndukItem[]) => {
    const { data, error } = await supabase
      .from("daftar_isi_arsip_aktif")
      .select(`*`)
      .eq("id_isi_arsip", id)
      .single();

    if (error || !data) {
      toast.error("Gagal memuat data isi arsip untuk diedit.");
      router.push("/arsip/arsip-aktif");
      return;
    }

    const parentBerkasInduk = currentBerkasIndukList.find(b => b.id_arsip_aktif === data.id_berkas_induk_fkey);

    setFormData({
      id_berkas_induk_fkey: data.id_berkas_induk_fkey || null,
      nomor_item: data.nomor_item || "",
      file_url: data.file_url || null,
      kode_klasifikasi: parentBerkasInduk?.kode_klasifikasi || data.kode_klasifikasi || "",
      uraian_informasi: data.uraian_informasi || "",
      tanggal_penciptaan_mulai: data.tanggal_penciptaan_mulai || (parentBerkasInduk?.kurun_waktu ? parseDateRangeString(parentBerkasInduk.kurun_waktu).startDate || "" : ""),
      tanggal_mulai: data.tanggal_mulai || "",
      tanggal_berakhir: data.tanggal_berakhir || "",
      masa_retensi: parentBerkasInduk?.masa_retensi?.toString() || data.masa_retensi?.toString() || "",
      kurun_waktu: data.kurun_waktu || "",
      jangka_simpan: parentBerkasInduk?.jangka_simpan || data.jangka_simpan || "",
      jumlah: data.jumlah?.toString() || "",
      keterangan: data.keterangan || "",
      tingkat_perkembangan: data.tingkat_perkembangan || "",
      media_simpan: parentBerkasInduk?.media_simpan || data.media_simpan || "",
    });

    setSelectedBerkasIndukId(data.id_berkas_induk_fkey || null);
    if (data.file_url) setPdfPreviewUrl(data.file_url);
  };

  const fetchData = async () => {
    // Pengecekan user sudah dilakukan oleh 'enabled' di page.tsx,
    // namun 'id_bidang_fkey' tetap penting untuk dicek di sini.
    if (!user?.id_bidang_fkey) {
      setBerkasIndukList([]);
      return;
    }
    // Pengecekan user dan role sudah dilakukan di level halaman
    // Jika user null di sini, berarti halaman belum siap atau ada masalah di level atas
    if (!user || !user.id_bidang_fkey) {
      // Mungkin set berkasIndukList ke array kosong atau handle error
      setBerkasIndukList([]);
      return;
    }

    try {
      // Fetch both berkas induk and moved archives in parallel
      const [berkasIndukResult, movedArchivesResult] = await Promise.allSettled([
        supabase
          .from("arsip_aktif")
          .select(`
            id_arsip_aktif, 
            uraian_informasi, 
            nomor_berkas, 
            kode_klasifikasi, 
            masa_retensi, 
            kurun_waktu, 
            jangka_simpan, 
            media_simpan, 
            lokasi_penyimpanan!inner(id_bidang_fkey)
          `)
          .eq("lokasi_penyimpanan.id_bidang_fkey", user.id_bidang_fkey),
        
        supabase
          .from("pemindahan_arsip_link")
          .select("id_arsip_aktif_fkey")
      ]);

      if (berkasIndukResult.status === 'fulfilled' && movedArchivesResult.status === 'fulfilled') {
        const { data: berkasData, error: berkasError } = berkasIndukResult.value;
        const { data: movedData, error: movedError } = movedArchivesResult.value;

        if (berkasError) {
          toast.error(`Gagal memuat daftar berkas induk: ${berkasError.message}`);
          setBerkasIndukList([]);
          return;
        }

        if (movedError) {
          console.warn("Warning: Gagal memuat data arsip yang dipindahkan, menampilkan semua arsip:", movedError.message);
          // Continue with all data if moved archives query fails
          setBerkasIndukList((berkasData as BerkasIndukItem[]) || []);
        } else {
          // Filter out moved archives
          const movedArchiveIds = new Set(movedData?.map(item => item.id_arsip_aktif_fkey) || []);
          const filteredBerkasData = (berkasData as BerkasIndukItem[])?.filter(
            berkas => !movedArchiveIds.has(berkas.id_arsip_aktif)
          ) || [];
          
          setBerkasIndukList(filteredBerkasData);

          if (editId) {
            // Panggil loadArchiveDataForEdit di sini dengan data yang baru di-fetch
            // untuk menghindari race condition dan stale state.
            await loadArchiveDataForEdit(editId, filteredBerkasData);
          }
        }

        // Validasi selectedBerkasIndukId dari localStorage
        if (typeof window !== 'undefined' && !editId) {
          const storedId = localStorage.getItem(ARSIP_LAST_SELECTED_BERKAS_INDUK_ID_KEY);
          const currentData = berkasData as BerkasIndukItem[];
          if (storedId && currentData && !currentData.find(b => b.id_arsip_aktif === storedId)) {
            localStorage.removeItem(ARSIP_LAST_SELECTED_BERKAS_INDUK_ID_KEY);
            setSelectedBerkasIndukId(null); // Reset jika tidak valid lagi
          } else if (storedId && selectedBerkasIndukId !== storedId) {
            // Also check if the stored ID is not in moved archives
            const movedIds = movedArchivesResult.status === 'fulfilled' && movedArchivesResult.value.data 
              ? new Set(movedArchivesResult.value.data.map(item => item.id_arsip_aktif_fkey))
              : new Set();
            
            if (!movedIds.has(storedId)) {
              setSelectedBerkasIndukId(storedId);
            } else {
              localStorage.removeItem(ARSIP_LAST_SELECTED_BERKAS_INDUK_ID_KEY);
              setSelectedBerkasIndukId(null);
            }
          }
        }
      } else {
        if (berkasIndukResult.status === 'rejected') {
          toast.error(`Gagal memuat daftar berkas induk: ${(berkasIndukResult.reason as Error).message}`);
        }
        if (movedArchivesResult.status === 'rejected') {
          console.warn("Warning: Gagal memuat data arsip yang dipindahkan:", (movedArchivesResult.reason as Error).message);
        }
        setBerkasIndukList([]);
      }

    } catch (error) {
      toast.error(`Terjadi kesalahan saat memuat data awal: ${(error as Error).message}`);
    }
  };
  fetchData();
}, [enabled, user, router, supabase, editId, setPdfPreviewUrl, setFormData, setSelectedBerkasIndukId]);

  // Fetch next nomor_item for the selected berkas_induk
  useEffect(() => {
    if (!enabled) return;

    const fetchNextNomorItemSuffix = async () => {
      // Pengecekan user.id_bidang_fkey juga penting di sini, meskipun tidak secara langsung digunakan,
      // selectedBerkasIndukId bergantung pada data yang di-fetch berdasarkan user.id_bidang_fkey
      if (!user?.id_bidang_fkey) return;

      if (!selectedBerkasIndukId || editId) { // Don't fetch if no parent or in edit mode
        if (!editId && !selectedBerkasIndukId) setNomorItemSuffix(1); // Default to 1 if no parent and not editing
        else {
          return;
        }
      }
      if (!selectedBerkasIndukId) { // If no parent, reset suffix for new entry (if applicable)
        if (!editId) setNomorItemSuffix(1);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("daftar_isi_arsip_aktif")
          .select("nomor_item") // nomor_item is a string like "1.1", "1.2"
          .eq("id_berkas_induk_fkey", selectedBerkasIndukId);

        if (error) {
          toast.error("Gagal mengambil data nomor item.");
          if (!editId) setNomorItemSuffix(1);
          return;
        }

        let maxSuffix = 0;
        if (data && data.length > 0) {
          data.forEach(item => {
            if (item.nomor_item && typeof item.nomor_item === 'string') {
              const parts = item.nomor_item.split('.');
              // Ensure the format is X.Y and X matches the parent's nomor_berkas (optional check, but good for data integrity)
              if (parts.length === 2) {
                const suffix = parseInt(parts[1], 10);
                if (!isNaN(suffix) && suffix > maxSuffix) {
                  maxSuffix = suffix;
                }
              }
            }
          });
        }
        if (!editId) setNomorItemSuffix(maxSuffix + 1);

      } catch (e) {
        toast.error("Terjadi kesalahan saat mengambil nomor item berikutnya.");
        if (!editId) setNomorItemSuffix(1);
      }
    };
    fetchNextNomorItemSuffix();
  }, [enabled, selectedBerkasIndukId, supabase, editId]);

  // Sync auto-generated nomorItemSuffix to formData.nomor_item
  useEffect(() => {
    if (!enabled) return; // Hanya jalankan jika form aktif
    if (!editId && selectedBerkasIndukId && nomorItemSuffix > 0) {
      const selectedBerkas = berkasIndukList.find(b => b.id_arsip_aktif === selectedBerkasIndukId);
      if (selectedBerkas) {
        const newNomorItem = `${selectedBerkas.nomor_berkas}.${nomorItemSuffix}`;
        setFormData(prev => {
          if (prev.nomor_item !== newNomorItem || prev.id_berkas_induk_fkey !== selectedBerkasIndukId) {
            return { ...prev, nomor_item: newNomorItem, id_berkas_induk_fkey: selectedBerkasIndukId };
          }
          return prev;
        });
      }
    } else if (!selectedBerkasIndukId && !editId) {
        setFormData(prev => ({ ...prev, nomor_item: "", id_berkas_induk_fkey: null }));
    }
  }, [enabled, nomorItemSuffix, editId, selectedBerkasIndukId, berkasIndukList, setFormData]);

  useEffect(() => {
    // Only run if not in edit mode, a parent is selected, and the list of parents is available
    if (!enabled) return; // Hanya jalankan jika form aktif
    if (!editId && selectedBerkasIndukId && berkasIndukList.length > 0) {
      const selectedBerkas = berkasIndukList.find(b => b.id_arsip_aktif === selectedBerkasIndukId);
      if (selectedBerkas) {
        setFormData(prev => ({
          ...prev,
          // Inherit these fields from the parent
          kode_klasifikasi: selectedBerkas.kode_klasifikasi,
          masa_retensi: selectedBerkas.masa_retensi || "",
          jangka_simpan: selectedBerkas.jangka_simpan || "",
          media_simpan: selectedBerkas.media_simpan || "",
          // Optionally, you can reset item-specific fields here if needed,
          // but it's better to handle that in a dedicated reset function.
        }));
      }
    } else if (!selectedBerkasIndukId && !editId) {
      // If no parent is selected, ensure relevant fields are cleared
      setFormData(prev => ({ ...prev, kode_klasifikasi: "", masa_retensi: "", jangka_simpan: "", media_simpan: "" }));
    }
  }, [enabled, selectedBerkasIndukId, berkasIndukList, editId, setFormData]);

  useEffect(() => {
    if (!enabled) return; // Hanya jalankan jika form aktif
    if (formData.tanggal_penciptaan_mulai) {
      const tglCiptaMulai = new Date(formData.tanggal_penciptaan_mulai);
      if (!isNaN(tglCiptaMulai.getTime())) {
        const tahunCiptaMulai = tglCiptaMulai.getFullYear();
        const tanggalMulaiAktif = new Date(tahunCiptaMulai + 1, 0, 1);
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
      setFormData(prev => {
        if (prev.tanggal_mulai !== "") {
          return { ...prev, tanggal_mulai: "" };
        }
        return prev;
      });
    } // Tidak perlu else di sini karena jika tanggal_penciptaan_mulai kosong, tanggal_mulai juga akan kosong atau di-reset oleh effect lain jika perlu.
  }, [formData.tanggal_penciptaan_mulai, setFormData]);

  // Otomatis: kurun_waktu (dari tanggal_penciptaan_mulai item)
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  useEffect(() => {
    if (!enabled) return; // Hanya jalankan jika form aktif
    if (formData.tanggal_penciptaan_mulai) {
      const tglMulaiCipta = new Date(formData.tanggal_penciptaan_mulai);
      if (!isNaN(tglMulaiCipta.getTime())) {
        const kurunWaktuCiptaStr = formatDate(tglMulaiCipta); // Single date format
        setFormData(prev => {
          if (prev.kurun_waktu !== kurunWaktuCiptaStr) {
            return { ...prev, kurun_waktu: kurunWaktuCiptaStr };
          }
          return prev;
        });
      } else {
        setFormData(prev => ({ ...prev, kurun_waktu: "" }));
      }
    } else {
        setFormData(prev => ({ ...prev, kurun_waktu: "" }));
    }
  // Only depends on tanggal_penciptaan_mulai now
  }, [enabled, formData.tanggal_penciptaan_mulai, setFormData]);

  useEffect(() => {
    if (!enabled) return; // Hanya jalankan jika form aktif
    if (formData.tanggal_mulai) {
      const tanggalMulai = new Date(formData.tanggal_mulai);
      if (!isNaN(tanggalMulai.getTime())) {
        let tanggalBerakhir: Date;
        const masaRetensiNum = parseInt(formData.masa_retensi);

        if (formData.masa_retensi && !isNaN(masaRetensiNum) && masaRetensiNum > 0) {
          const tahunBerakhir = tanggalMulai.getFullYear() + masaRetensiNum - 1;
          tanggalBerakhir = new Date(tahunBerakhir, 11, 31);
        } else {
          tanggalBerakhir = new Date(tanggalMulai.getFullYear(), 11, 31);
        }

        const tanggalBerakhirStr = tanggalBerakhir.toISOString().split('T')[0];

        setFormData(prev => {
          if (prev.tanggal_berakhir !== tanggalBerakhirStr) {
            return { ...prev, tanggal_berakhir: tanggalBerakhirStr };
          }
          return prev;
        });
      }
    } else {
      setFormData(prev => {
        if (prev.tanggal_berakhir !== "") { // Only check tanggal_berakhir
          return { ...prev, tanggal_berakhir: "" };
        }
        return prev;
      });
    } // Tidak perlu else di sini karena jika tanggal_mulai kosong, tanggal_berakhir juga akan kosong.
  }, [formData.tanggal_mulai, formData.masa_retensi, setFormData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "nomor_item") { // Changed from nomor_berkas
      // nomor_item is now a string and generally read-only, but if manual changes are allowed:
      setFormData(prev => ({ ...prev, nomor_item: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectBerkasInduk = (berkasId: string | null) => {
    setSelectedBerkasIndukId(berkasId);
    if (typeof window !== 'undefined' && !editId) { // Simpan ke localStorage hanya jika bukan mode edit
      if (berkasId) {
        localStorage.setItem(ARSIP_LAST_SELECTED_BERKAS_INDUK_ID_KEY, berkasId);
      } else {
        localStorage.removeItem(ARSIP_LAST_SELECTED_BERKAS_INDUK_ID_KEY);
      }
    }
    if (berkasId) {
      const selectedBerkas = berkasIndukList.find(b => b.id_arsip_aktif === berkasId);
      if (selectedBerkas) {
        setFormData(prev => ({
          ...prev,
          id_berkas_induk_fkey: berkasId,
          nomor_item: "",
          kode_klasifikasi: selectedBerkas.kode_klasifikasi,
          masa_retensi: selectedBerkas.masa_retensi || "",
          kurun_waktu: selectedBerkas.kurun_waktu || "",
          jangka_simpan: selectedBerkas.jangka_simpan || "",
          media_simpan: selectedBerkas.media_simpan || "",
          tanggal_penciptaan_mulai: selectedBerkas.kurun_waktu
            ? parseDateRangeString(selectedBerkas.kurun_waktu).startDate || ""
            : "",
        }));
      } else {
        // Berkas tidak ditemukan, reset kode klasifikasi juga
        setFormData(prev => ({ ...prev, id_berkas_induk_fkey: berkasId, nomor_item: "", kode_klasifikasi: "", masa_retensi: "", kurun_waktu: "", tanggal_penciptaan_mulai: "", jangka_simpan: "", media_simpan: "" }));
      }
    } else {
      // Tidak ada berkas induk dipilih, reset
      setFormData(prev => ({ ...prev, id_berkas_induk_fkey: null, nomor_item: "", kode_klasifikasi: "", masa_retensi: "", kurun_waktu: "", tanggal_penciptaan_mulai: "", jangka_simpan: "", media_simpan: "" }));
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

      if (extractedData.uraian_informasi) {
        setFormData(prev => ({
          ...prev,
          uraian_informasi: extractedData.uraian_informasi
        }));
      }
      if (extractedData.tanggal_mulai_suggested) {
        setFormData(prev => ({
          ...prev,
          tanggal_penciptaan_mulai: extractedData.tanggal_mulai_suggested || ""
        }));
      }
    } catch (error) {
      toast.error("Gagal mengekstrak data dari PDF.");
    } finally {
      setOcrLoading(false);
    }
  };

  // Handler submit, isi sesuai logic utama
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!selectedBerkasIndukId && !editId) { // For new items, parent must be selected
      toast.error("Silakan pilih Berkas Induk terlebih dahulu.");
      setSubmitting(false);
      return;
    }

    try {
      // Kode klasifikasi diambil dari formData, yang sudah di-set dari induk
      const kodeLengkap = formData.kode_klasifikasi;

      if (!user || !user.id || !user.id_bidang_fkey || !user.daftar_bidang?.nama_bidang) {
        toast.warning("Sesi pengguna tidak valid atau data bidang tidak lengkap untuk menyimpan isi arsip.");
        setSubmitting(false);
        return;
      }
      if (!user.id_bidang_fkey) {
        toast.error("ID Bidang pengguna tidak tersedia untuk notifikasi.");
        setSubmitting(false);
        return;
      }

      let fileUrl: string | null = null;
      if (pdfFile) {
        const fileExt = pdfFile.name.split('.').pop();
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
        const kodeKlasifikasiFormatted = kodeLengkap.replace(/\//g, '-');
        const fileName = `${kodeKlasifikasiFormatted}_${timestamp}.${fileExt}`;
        const filePath = `arsip_aktif/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('arsip').upload(filePath, pdfFile);

        if (uploadError) {
          toast.warning('Gagal mengunggah file.');
          setSubmitting(false);
          return;
        }
        fileUrl = supabase.storage.from('arsip').getPublicUrl(filePath).data.publicUrl; // Use consistent bucket name
      } else if (editId && formData.file_url) {
        fileUrl = formData.file_url;
      }

      let finalNomorItemString: string; // Changed to string
      if (editId) {
        if (!formData.nomor_item || formData.nomor_item.trim() === "") {
          toast.error("Nomor Item tidak boleh kosong untuk isi arsip yang diedit.");
          setSubmitting(false);
          return;
        }
        finalNomorItemString = formData.nomor_item;
      } else {
        finalNomorItemString = formData.nomor_item; // Already a string "X.Y"
        if (!finalNomorItemString || finalNomorItemString.trim() === "" || !finalNomorItemString.includes('.')) {
            toast.error("Nomor Item tidak valid. Coba refresh atau isi manual setelah memilih Berkas Induk.");
            setSubmitting(false); return;
        }
      }

      const isiArsipDataToSave = {
        id_berkas_induk_fkey: editId ? formData.id_berkas_induk_fkey : selectedBerkasIndukId,
        nomor_item: finalNomorItemString, // Save the "X.Y" string
        kode_klasifikasi: kodeLengkap,
        uraian_informasi: formData.uraian_informasi,
        masa_retensi: formData.masa_retensi
          ? (isNaN(parseInt(formData.masa_retensi, 10)) ? null : parseInt(formData.masa_retensi, 10))
          : null,
        kurun_waktu: formData.kurun_waktu,
        jangka_simpan: formData.jangka_simpan,
        jumlah: formData.jumlah
          ? (isNaN(parseInt(formData.jumlah, 10)) ? null : parseInt(formData.jumlah, 10))
          : null,
        keterangan: formData.keterangan,
        tingkat_perkembangan: formData.tingkat_perkembangan,
        media_simpan: formData.media_simpan,
        file_url: fileUrl,
        user_id: user.id,
        tanggal_mulai: formData.tanggal_mulai,
        tanggal_berakhir: formData.tanggal_berakhir,
      };

      if (editId) {
        const { error: updateError } = await supabase
          .from('daftar_isi_arsip_aktif') // Changed table
          .update(isiArsipDataToSave) // Pass single object
          .eq('id_isi_arsip', editId); // Changed primary key
        if (updateError) {
          console.error("Supabase update error:", updateError);
          toast.error(`Gagal memperbarui data arsip: ${updateError.message}`);
        } else {
          await supabase
            .from('draft_input_arsip')
            .delete()
            .eq('user_id', user.id);
          toast.success('Isi Arsip berhasil diperbarui!');
          router.push(`/arsip/arsip-aktif/detail-item/${editId}`);
        }
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from('daftar_isi_arsip_aktif')
          .insert(isiArsipDataToSave)
          .select()
          .single();
        if (insertError) {
          console.error("Supabase insert error:", insertError);
          toast.error(`Gagal menyimpan data isi arsip: ${insertError.message}`);
        } else {
          await supabase
            .from('draft_input_arsip')
            .delete()
            .eq('user_id', user.id);
          toast.success(`Isi Arsip dengan nomor item ${isiArsipDataToSave.nomor_item} berhasil disimpan!`);
          setNomorItemSuffix(prev => prev + 1); // Increment suffix for next item
          resetFormForNewEntry();
          const isiArsipId = insertedData?.id_isi_arsip;
          if (isiArsipId) {
            sendDepartmentHeadNotification(
                user.id_bidang_fkey, // Gunakan id_bidang_fkey dari user context
                "Permintaan Persetujuan Arsip Baru",
                `Arsip baru dengan kode klasifikasi ${kodeLengkap} telah ditambahkan dan menunggu persetujuan.`,
                "/unit-pengolah/verifikasi-arsip",
                "verifikasi arsip aktif",
            ).then(() => {
            }).catch(notifError => {
              console.warn("Pengiriman notifikasi ke Kepala Bidang gagal (proses latar belakang):", notifError);
              toast.warn("Isi Arsip berhasil disimpan, namun notifikasi ke Kepala Bidang gagal terkirim.");
            });
          }
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(`Terjadi kesalahan saat menyimpan data: ${(error as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = () => {
    setSubmitting(false);
    toast.info("Proses penyimpanan dibatalkan.");
  };

  return {
    editId,
    formData,
    setFormData,
    pdfFile,
    pdfPreviewUrl,
    pageCount,
    ocrLoading,
    submitting: submitting,
    handleChange,
    handlePdfUpload,
    handleExtractPdf,
    handleSubmit,
    handleSelectBerkasInduk,
    selectedBerkasIndukId,
    berkasIndukList,
    handleCancelSubmit,
    router,
    handleRefreshDraft,
  };
}
