"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { processPDF } from "@/utils/ocrService";
import { sendDepartmentHeadNotification } from "@/utils/notificationService";
import { usePdfUpload } from "./usePdfUpload";
import { useArchiveLocation } from "./useArchiveLocation";
import { useFormDraft } from "./useFormDraft";
import { useAuth } from "@/context/AuthContext";
import { findKlasifikasiData } from "@/utils/findKlasifikasiData";

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

interface KlasifikasiItem {
  kode_klasifikasi: string;
  label: string;
}

interface KlasifikasiArsipInfo {
  kode_klasifikasi: string;
  aktif: number | string | null;
  inaktif: number | string | null;
  nasib_akhir: string | null;
}

const SUPABASE_QUERY_TIMEOUT_MS = 15000;
class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export function useArsipAktifForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");

  const { user, isLoading: isAuthLoading, error: authError } = useAuth();
  const ALLOWED_ROLE = "Pegawai";
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
    jangka_simpan: "",
    jumlah: "",
    keterangan: "",
    tingkat_perkembangan: "",
    media_simpan: "",
  });

  // PDF Upload & Preview (custom hook)
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
  const [nomorBerkas, setNomorBerkas] = useState<number>(0);

  const [selectedKodeDasar, setSelectedKodeDasar] = useState("");
  const [kodeTambahan, setKodeTambahan] = useState("");
  const [klasifikasiList, setKlasifikasiList] = useState<KlasifikasiItem[]>([]);
  const [kodeKlasifikasiMode, setKodeKlasifikasiMode] = useState<'otomatis' | 'manual'>('manual');

  // Location calculation (custom hook)
  const calculatedLocation = useArchiveLocation({
    userNamaBidang: user?.daftar_bidang?.nama_bidang || null,
    kodeKlasifikasi: kodeKlasifikasiMode === "otomatis"
      ? selectedKodeDasar
      : formData.kode_klasifikasi.split("/")[0].trim() || formData.kode_klasifikasi.trim(),
    userIdBidang: user?.id_bidang_fkey || null,
    editId,
  });

  // Draft management (custom hook)
  useFormDraft<FormDataState>(formData, user?.id || null, editId, setFormData);

  const resetFormForNewEntry = () => {
    setFormData({
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
    setKodeKlasifikasiMode('manual');
  };

  // Helper function to parse "DD-MM-YYYY s.d. DD-MM-YYYY" or "DD-MM-YYYY" into start and end dates
  const parseDateRangeString = (dateStr: string | null | undefined): { startDate: string | null, endDate: string | null } => {
    if (!dateStr) return { startDate: null, endDate: null };

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
  };

  // Load archive data for edit
  const loadArchiveDataForEdit = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("arsip_aktif")
      .select(`*, lokasi_penyimpanan:id_lokasi_fkey(*)`)
      .eq("id_arsip_aktif", id)
      .single();

    if (error || !data) {
      toast.error("Gagal memuat data arsip untuk diedit.");
      router.push("/arsip/arsip-aktif/daftar-aktif");
      return;
    }

    const currentKodeKlasifikasi = data.kode_klasifikasi || "";
    const parsedKurunWaktu = parseDateRangeString(data.kurun_waktu);
    const parsedJangkaSimpan = parseDateRangeString((data as any).jangka_simpan);

    setFormData({
      nomor_berkas: data.nomor_berkas || 0,
      file_url: data.file_url || null,
      kode_klasifikasi: data.kode_klasifikasi || "",
      uraian_informasi: data.uraian_informasi || "",
      tanggal_penciptaan_mulai: parsedKurunWaktu.startDate || "",
      tanggal_penciptaan_berakhir: parsedKurunWaktu.endDate || "",
      tanggal_mulai: parsedJangkaSimpan.startDate || "",
      tanggal_berakhir: parsedJangkaSimpan.endDate || "",
      masa_retensi: data.masa_retensi?.toString() || "",
      kurun_waktu: data.kurun_waktu || "",
      jangka_simpan: (data as any).jangka_simpan || "",
      jumlah: data.jumlah?.toString() || "",
      keterangan: data.keterangan || "",
      tingkat_perkembangan: data.tingkat_perkembangan || "",
      media_simpan: data.media_simpan || "",
    });

    const [kodeDasar, ...kodeTambahanArray] = currentKodeKlasifikasi.split("/");
    setSelectedKodeDasar(kodeDasar || "");
    setKodeTambahan(kodeTambahanArray.join("/") || "");
    if (data.file_url) setPdfPreviewUrl(data.file_url);
  }, [supabase, router, setPdfPreviewUrl]);

  // Effect to handle authentication status and fetch initial data (klasifikasi, edit data)
  useEffect(() => {
    const fetchData = async () => {
      // Jika AuthContext masih loading, tunggu
      if (isAuthLoading) return;

      // Jika tidak ada user setelah AuthContext selesai loading, redirect (AuthContext seharusnya sudah melakukan ini)
      if (!user) {
        // router.push("/sign-in"); // AuthContext handles this
        return;
      }

      // Verifikasi role pengguna
      if (user.role !== ALLOWED_ROLE) {
        toast.warn("Anda tidak memiliki izin untuk mengakses halaman ini.");
        router.push(DEFAULT_HOME_PATH);
        return;
      }

      // Pastikan data bidang pengguna tersedia
      if (!user.id_bidang_fkey || !user.daftar_bidang?.nama_bidang) {
         toast.warn("Data pengguna (peran/bidang) tidak lengkap. Silakan login kembali atau hubungi admin.");
         // AuthContext might handle redirect, but explicit check is good
         // router.push("/sign-in");
         return;
      }

      // Ambil daftar klasifikasi
      try {
        // Gunakan Promise.race untuk timeout
        const klasifikasiPromise = supabase
          .from("klasifikasi_arsip")
          .select("kode_klasifikasi, label");

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new TimeoutError(`Pengambilan daftar klasifikasi melebihi batas waktu ${SUPABASE_QUERY_TIMEOUT_MS}ms.`)), SUPABASE_QUERY_TIMEOUT_MS) // Gunakan konstanta timeout
        );

        const result = await Promise.race([klasifikasiPromise, timeoutPromise]) as { data: KlasifikasiItem[] | null; error: any; };
        if (result.error) {
          toast.error(`Gagal memuat daftar klasifikasi: ${result.error.message}`);
          setKlasifikasiList([]);
        } else {
          setKlasifikasiList(result.data || []);
        }
      } catch (error) {
        toast.error(`Gagal memuat daftar klasifikasi: ${(error as Error).message}`);
        setKlasifikasiList([]);
      }

      // Jika dalam mode edit, muat data arsip
      if (editId) {
        await loadArchiveDataForEdit(editId);
      }
    };

    fetchData();
  }, [user, isAuthLoading, authError, router, supabase, editId, loadArchiveDataForEdit]);
  // Fetch nomor berkas otomatis
  useEffect(() => {
    const fetchNextNomorBerkasForBidang = async () => {
      if (isAuthLoading || !user?.id_bidang_fkey || editId) return;
      try {
        const { data: pemindahanLinks, error: pemindahanError } = await supabase
          .from('pemindahan_arsip_link')
          .select('id_arsip_aktif_fkey');
        if (pemindahanError) {
          toast.error("Gagal memuat data link pemindahan: " + pemindahanError.message);
          if (!editId) setNomorBerkas(1);
          return;
        }
        const idsToExclude = pemindahanLinks?.map(link => link.id_arsip_aktif_fkey).filter(id => id != null) || [];

        let query = supabase
          .from("arsip_aktif")
          .select("nomor_berkas, lokasi_penyimpanan!inner(id_bidang_fkey), id_arsip_aktif")
          .eq("lokasi_penyimpanan.id_bidang_fkey", user.id_bidang_fkey);

        if (idsToExclude.length > 0) {
          const idsToExcludeString = `(${idsToExclude.join(',')})`;
          query = query.not('id_arsip_aktif', 'in', idsToExcludeString);
        }

        const { data, error } = await query
          .order("nomor_berkas", { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          toast.error("Gagal mengambil nomor berkas berikutnya.");
          if (!editId) setNomorBerkas(1);
          return;
        }

        const lastNomorBerkas = data?.nomor_berkas || 0;
        if (!editId) setNomorBerkas(lastNomorBerkas + 1);
      } catch (e) {
        toast.error("Terjadi kesalahan saat mengambil nomor berkas berikutnya.");
        if (!editId) setNomorBerkas(1);
      }
    };
    fetchNextNomorBerkasForBidang();
  }, [isAuthLoading, user, supabase, editId]);

  // Sinkronkan nomorBerkas otomatis dari state ke formData.nomor_berkas jika entri baru
  useEffect(() => {
    if (!editId && nomorBerkas > 0) {
      setFormData(prev => {
        if (prev.nomor_berkas === 0) {
          return { ...prev, nomor_berkas: nomorBerkas };
        }
        return prev;
      });
    }
  }, [nomorBerkas, editId, setFormData]);

  // Kode Klasifikasi Otomatis
  useEffect(() => {
    if (kodeKlasifikasiMode === 'otomatis') {
      const kodeLengkap = selectedKodeDasar + (kodeTambahan ? `/${kodeTambahan}` : "");
      setFormData(prev => {
        if (!selectedKodeDasar) return prev;
        if (prev.kode_klasifikasi !== kodeLengkap) {
          return { ...prev, kode_klasifikasi: kodeLengkap };
        }
        return prev;
      });
    }
  }, [selectedKodeDasar, kodeTambahan, kodeKlasifikasiMode, setFormData]);

  // Otomatis: tanggal_mulai (1 Januari tahun berikutnya dari tanggal_penciptaan_mulai)
  useEffect(() => {
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
    }
  }, [formData.tanggal_penciptaan_mulai, setFormData]);

  // Otomatis: tanggal_penciptaan_berakhir = tanggal_penciptaan_mulai (jika kosong)
  useEffect(() => {
    if (formData.tanggal_penciptaan_mulai) {
      setFormData(prev => {
        if (prev.tanggal_penciptaan_berakhir !== formData.tanggal_penciptaan_mulai) {
          return { ...prev, tanggal_penciptaan_berakhir: formData.tanggal_penciptaan_mulai };
        }
        return prev;
      });
    }
  }, [formData.tanggal_penciptaan_mulai, setFormData]);

  // Otomatis: kurun_waktu (periode penciptaan arsip)
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

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
  }, [formData.tanggal_penciptaan_mulai, formData.tanggal_penciptaan_berakhir, setFormData]);

  // Otomatis: tanggal_berakhir & jangka_simpan
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
          tanggalBerakhir = new Date(tanggalMulai.getFullYear(), 11, 31);
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
  }, [formData.tanggal_mulai, formData.masa_retensi, setFormData]);

  // Handler untuk input form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "nomor_berkas") {
      const numericValue = value === "" ? 0 : parseInt(value, 10);
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

  // Handler untuk OCR Extract PDF
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

      const kodeOcr = extractedData.kode_klasifikasi || "";
      setFormData(prev => ({ ...prev, kode_klasifikasi: kodeOcr, masa_retensi: "" }));

      if (kodeOcr) {
        const klasifikasiInfo = await findKlasifikasiData(supabase, kodeOcr);

        if (klasifikasiInfo) {
          const newBaseCodeFromDb = klasifikasiInfo.kode_klasifikasi;
          const originalOcrBaseCode = kodeOcr.split('/')[0].trim();
          let originalOcrSuffix = "";

          if (kodeOcr.includes('/') && kodeOcr.length > originalOcrBaseCode.length) {
            originalOcrSuffix = kodeOcr.substring(originalOcrBaseCode.length);
          }

          const reconstructedFullCode = newBaseCodeFromDb + originalOcrSuffix;

          setFormData(prev => ({
            ...prev,
            kode_klasifikasi: reconstructedFullCode,
            masa_retensi: klasifikasiInfo.aktif?.toString() || "",
          }));

          setKodeKlasifikasiMode('otomatis');
          setSelectedKodeDasar(newBaseCodeFromDb);

          const suffixForKodeTambahan = originalOcrSuffix.startsWith('/') ? originalOcrSuffix.substring(1) : originalOcrSuffix;
          setKodeTambahan(suffixForKodeTambahan);
        }
      }

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

    try {
      let kodeLengkap = "";
      if (kodeKlasifikasiMode === 'otomatis') {
        kodeLengkap = selectedKodeDasar + (kodeTambahan ? `/${kodeTambahan}` : "");
      } else {
        kodeLengkap = formData.kode_klasifikasi;
      }

      let retensiAktif = formData.masa_retensi;
      let retensiInaktif = "0";
      let nasibAkhir = "Permanen";

      if (kodeKlasifikasiMode === 'otomatis') {
        if (!selectedKodeDasar) {
          toast.error("Kode Klasifikasi Dasar harus dipilih dalam mode otomatis.");
          setSubmitting(false);
          return;
        }
      }

      // Gunakan user dari useAuth
      if (!user || !user.id || !user.id_bidang_fkey || !user.daftar_bidang?.nama_bidang) {
        toast.warning("Sesi pengguna tidak valid atau data bidang tidak lengkap untuk menyimpan arsip.");
        setSubmitting(false);
        return;
      }

      // user.id_bidang_fkey dan user.daftar_bidang.nama_bidang sudah divalidasi di useEffect awal
      if (!user.id_bidang_fkey) { // Double check, seharusnya tidak terjadi jika useEffect awal sudah benar
        toast.error("ID Bidang pengguna tidak tersedia untuk notifikasi.");
        setSubmitting(false);
        return;
      }

      // Upload file jika ada
      let fileUrl = '';
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
        fileUrl = supabase.storage.from('arsip').getPublicUrl(filePath).data.publicUrl;
      } else if (editId && pdfPreviewUrl) {
        fileUrl = pdfPreviewUrl;
      }

      let idLokasiFkey: string | null = null;
      if (calculatedLocation.no_filing_cabinet && calculatedLocation.no_laci && calculatedLocation.no_folder && user.id_bidang_fkey) {
        const { data: existingLokasi, error: lokErr } = await supabase
          .from("lokasi_penyimpanan")
          .select("id_lokasi")
          .eq("id_bidang_fkey", user.id_bidang_fkey)
          .eq("no_filing_cabinet", calculatedLocation.no_filing_cabinet)
          .eq("no_laci", calculatedLocation.no_laci)
          .eq("no_folder", calculatedLocation.no_folder)
          .single();

        if (lokErr && lokErr.code !== 'PGRST116') {
          toast.error("Gagal memeriksa lokasi penyimpanan.");
          setSubmitting(false);
          return;
        }

        if (existingLokasi) {
          idLokasiFkey = existingLokasi.id_lokasi;
        } else {
          const { data: newLokasi, error: insertLokErr } = await supabase
            .from("lokasi_penyimpanan")
            .insert({ id_bidang_fkey: user.id_bidang_fkey, ...calculatedLocation })
            .select("id_lokasi")
            .single();
          if (insertLokErr || !newLokasi) {
            toast.error("Gagal membuat entri lokasi baru.");
            setSubmitting(false); return;
          }
          idLokasiFkey = newLokasi.id_lokasi;
        }
      }

      let finalNomorBerkas: number;
      if (editId) {
        if (formData.nomor_berkas === 0) {
          toast.error("Nomor Berkas tidak boleh kosong untuk arsip yang diedit.");
          setSubmitting(false);
          return;
        }
        finalNomorBerkas = formData.nomor_berkas;
      } else {
        finalNomorBerkas = formData.nomor_berkas !== 0 ? formData.nomor_berkas : nomorBerkas;
      }

      const arsipDataToSave = {
        kode_klasifikasi: kodeLengkap,
        uraian_informasi: formData.uraian_informasi,
        masa_retensi: formData.masa_retensi ? parseInt(formData.masa_retensi) : null,
        kurun_waktu: formData.kurun_waktu,
        jangka_simpan: formData.jangka_simpan,
        jumlah: formData.jumlah ? parseInt(formData.jumlah) : null,
        keterangan: formData.keterangan,
        tingkat_perkembangan: formData.tingkat_perkembangan,
        media_simpan: formData.media_simpan,
        file_url: fileUrl,
        user_id: user.id,
        nomor_berkas: finalNomorBerkas,
        id_lokasi_fkey: idLokasiFkey,
      };

      arsipDataToSave.masa_retensi = parseInt(retensiAktif) || null;

      if (editId) {
        const { error: updateError } = await supabase
          .from('arsip_aktif')
          .update(arsipDataToSave)
          .eq('id_arsip_aktif', editId);
        if (updateError) {
          toast.error('Gagal memperbarui data arsip.');
        } else {
          await supabase
            .from('draft_input_arsip')
            .delete()
            .eq('user_id', user.id);
          toast.success('Arsip berhasil diperbarui!');
          router.push(`/arsip/arsip-aktif/detail/${editId}`);
        }
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from('arsip_aktif')
          .insert([arsipDataToSave])
          .select()
          .single();
        if (insertError) {
          toast.error('Gagal menyimpan data.');
        } else {
          await supabase
            .from('draft_input_arsip')
            .delete()
            .eq('user_id', user.id);
          toast.success(`Arsip dengan nomor berkas ${arsipDataToSave.nomor_berkas} berhasil disimpan!`);
          setNomorBerkas(prev => prev + 1);
          resetFormForNewEntry();
          const arsipId = insertedData?.id_arsip_aktif;
          if (arsipId) {
            // Jalankan pengiriman notifikasi di latar belakang
            // agar tidak memblokir reset state submitting.
            sendDepartmentHeadNotification(
                user.id_bidang_fkey, // Gunakan id_bidang_fkey dari user context
                "Permintaan Persetujuan Arsip Baru",
                `Arsip baru dengan kode klasifikasi ${kodeLengkap} telah ditambahkan dan menunggu persetujuan.`,
                "/unit-pengolah/verifikasi-arsip",
                "verifikasi arsip aktif",
            ).then(() => {
              // Opsional: bisa tambahkan log atau notifikasi sukses pengiriman jika perlu
              // console.log("Notifikasi ke Kepala Bidang berhasil dikirim.");
            }).catch(notifError => {
              console.warn("Pengiriman notifikasi ke Kepala Bidang gagal (proses latar belakang):", notifError);
              // Beri tahu pengguna dengan cara yang tidak mengganggu jika notifikasi gagal,
              // karena arsipnya sendiri sudah berhasil disimpan.
              toast.warn("Arsip berhasil disimpan, namun notifikasi ke Kepala Bidang gagal terkirim.");
            });
          }
        }
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = () => {
    setSubmitting(false);
    toast.info("Proses penyimpanan dibatalkan.");
  };

  const handleManualKodeKlasifikasiBlur = async () => {
    if (kodeKlasifikasiMode === 'manual' && formData.kode_klasifikasi.trim() !== "") {
      const kodeInputUser = formData.kode_klasifikasi.trim();
      const toastId = toast.loading("Mencari data klasifikasi...");

      try {
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new TimeoutError(`Pencarian data klasifikasi untuk '${kodeInputUser}' melebihi batas waktu ${SUPABASE_QUERY_TIMEOUT_MS}ms.`)), SUPABASE_QUERY_TIMEOUT_MS)
        );

        const klasifikasiInfo = await Promise.race([
          findKlasifikasiData(supabase, kodeInputUser),
          timeoutPromise
        ]) as KlasifikasiArsipInfo | null;

        if (klasifikasiInfo) {
          const dbBaseKode = klasifikasiInfo.kode_klasifikasi;
          const userInputBaseKode = kodeInputUser.split('/')[0].trim();
          let userInputSuffix = "";
          if (kodeInputUser.includes('/') && kodeInputUser.length > userInputBaseKode.length) {
            userInputSuffix = kodeInputUser.substring(userInputBaseKode.length);
          }

          const finalKodeKlasifikasi = dbBaseKode + userInputSuffix;
          const newMasaRetensi = klasifikasiInfo.aktif?.toString() || "";

          setFormData(prev => ({
            ...prev,
            kode_klasifikasi: finalKodeKlasifikasi,
            masa_retensi: newMasaRetensi,
          }));

          toast.update(toastId, { render: `Retensi untuk kode '${finalKodeKlasifikasi}' ditemukan: ${newMasaRetensi} tahun.`, type: "success", isLoading: false, autoClose: 3000 });
        } else {
          setFormData(prev => ({ ...prev, masa_retensi: "" }));
          toast.update(toastId, { render: `Kode klasifikasi '${kodeInputUser}' tidak ditemukan. Harap isi retensi manual.`, type: "warning", isLoading: false, autoClose: 3000 });
        }
      } catch (error) {
        if (error instanceof TimeoutError) {
          toast.update(toastId, { render: error.message, type: "error", isLoading: false, autoClose: 5000 });
        } else {
          toast.update(toastId, { render: "Gagal mencari data klasifikasi.", type: "error", isLoading: false, autoClose: 3000 });
        }
        setFormData(prev => ({ ...prev, masa_retensi: "" }));
      }
    }
  };

  return {
    editId,
    formData,
    setFormData,
    pdfFile,
    pdfPreviewUrl,
    pageCount,
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
    isAuthLoading,
    authError,
    handleManualKodeKlasifikasiBlur,
  };
}