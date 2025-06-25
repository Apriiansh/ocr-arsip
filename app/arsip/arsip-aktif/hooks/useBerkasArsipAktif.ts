"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { sendDepartmentHeadNotification } from "@/utils/notificationService";
import { useArchiveLocation } from "./useArchiveLocation";
import { useBerkasFormDraft } from "./useBerkasFormDraft";
import { UserProfile, useAuth } from "@/context/AuthContext"; 
import { BerkasArsipAktifFormData, KlasifikasiItem, KlasifikasiArsipInfo, TimeoutError as GlobalTimeoutError } from "../types"; 
import { findKlasifikasiData } from "@/utils/findKlasifikasiData";

const SUPABASE_QUERY_TIMEOUT_MS = 15000;

export function useBerkasArsipAktif(enabled: boolean, user: UserProfile | null = null) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: isAuthLoading } = useAuth(); 
  const editId = searchParams.get("editId");

  const [formData, setFormData] = useState<BerkasArsipAktifFormData>({
    nomor_berkas: 0,
    kode_klasifikasi: "",
    uraian_informasi: "",
    tanggal_penciptaan_mulai: "",
    tanggal_penciptaan_berakhir: "",
    tanggal_mulai: "",
    tanggal_berakhir: "",
    masa_retensi: "",
    kurun_waktu: "",
    jangka_simpan: "",
    jumlah: "1", 
    keterangan: "-",
    tingkat_perkembangan: "",
    media_simpan: "Filing Cabinet",
    akses: "Biasa",
  });

  const [submitting, setSubmitting] = useState(false);
  const [nomorBerkas, setNomorBerkas] = useState<number>(0); 

  // State for Kode Klasifikasi selection/input
  const [selectedKodeKlasifikasi, setSelectedKodeKlasifikasi] = useState("");
  // Hapus kodeTambahan dan state terkait
  const [klasifikasiList, setKlasifikasiList] = useState<KlasifikasiItem[]>([]);
  const [kodeKlasifikasiMode, setKodeKlasifikasiMode] = useState<'otomatis' | 'manual'>('manual');

  const calculatedLocation = useArchiveLocation({
    userNamaBidang: user?.daftar_bidang?.nama_bidang || null,
    kodeKlasifikasi: kodeKlasifikasiMode === "otomatis"
      ? selectedKodeKlasifikasi // Langsung gunakan selectedKodeKlasifikasi
      : formData.kode_klasifikasi.trim(),
    userIdBidang: user?.id_bidang_fkey || null,
    nomorBerkasInput: formData.nomor_berkas,
    editId,
  });

  // Hook for managing form draft in localStorage/DB
  const { loadDraft } = useBerkasFormDraft<BerkasArsipAktifFormData>(
    formData,
    user?.id || null,
    editId,
    setFormData
  );

  // Handler to refresh form data from draft
  const handleRefreshDraft = useCallback(async () => {
    if (user?.id && !editId) {
        await loadDraft(); 
    } else if (editId) {
        toast.info("Refresh draft tidak tersedia dalam mode edit.");
    } else {
        toast.warn("Pengguna tidak terautentikasi untuk memuat draft.");
    }
  }, [user, editId, loadDraft]);

  // Function to reset form fields for a new entry
  const resetFormForNewEntry = () => {
    setFormData({
      nomor_berkas: 0, 
      kode_klasifikasi: "",
      uraian_informasi: "",
      tanggal_penciptaan_mulai: "",
      tanggal_penciptaan_berakhir: "",
      tanggal_mulai: "",
      tanggal_berakhir: "",
      masa_retensi: "",
      kurun_waktu: "",
      jangka_simpan: "",
      jumlah: "1",
      keterangan: "-",
      tingkat_perkembangan: "",
      media_simpan: "Filing Cabinet",
      akses: "Biasa",
    });
    setSelectedKodeKlasifikasi(""); // Reset selectedKodeKlasifikasi
    setKodeKlasifikasiMode('manual');
  };

  // Helper function to parse date range strings (DD-MM-YYYY s.d. DD-MM-YYYY or DD-MM-YYYY)
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
      return { startDate: `${singleDateParts[2]}-${singleDateParts[1]}-${singleDateParts[0]}`, endDate: null };
    }
    return { startDate: dateStr, endDate: null };
  };

  // Effect to load archive data when in edit mode
  const loadArchiveDataForEdit = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("arsip_aktif") 
      .select(`*, lokasi_penyimpanan:id_lokasi_fkey(*)`)
      .eq("id_arsip_aktif", id)
      .single();

    if (error || !data) {
      // const errorMessage = error
      //   ? `Gagal memuat data berkas: ${error.message}`
      //   : "Data berkas untuk diedit tidak ditemukan.";
      // console.error("Error loading archive data for edit:", error);
      // toast.error(errorMessage);
      // router.push("/arsip/arsip-aktif/daftar-aktif"); // Dihapus agar tidak redirect
      return;
    }

    const currentKodeKlasifikasi = data.kode_klasifikasi || "";
    const parsedKurunWaktu = parseDateRangeString(data.kurun_waktu);
    const parsedJangkaSimpan = parseDateRangeString((data as any).jangka_simpan);

    setFormData({
      nomor_berkas: data.nomor_berkas || 0,
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
      akses: data.akses || "",
    });

    // Tidak perlu parsing kode dasar dan kode tambahan lagi
    setSelectedKodeKlasifikasi(currentKodeKlasifikasi);
  }, [supabase, router]);

  // Effect to fetch initial data (klasifikasi list) and load edit data if editId exists
  useEffect(() => {
    if (!enabled) return;

    const fetchData = async () => {
      // Check if user and required field (id_bidang_fkey) are available
      if (!user?.id_bidang_fkey) return;

      try {
        const klasifikasiPromise = supabase
          .from("klasifikasi_arsip")
          .select("kode_klasifikasi, label");
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new GlobalTimeoutError(`Pengambilan daftar klasifikasi melebihi batas waktu ${SUPABASE_QUERY_TIMEOUT_MS}ms.`)), SUPABASE_QUERY_TIMEOUT_MS)
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

      if (editId) {
        await loadArchiveDataForEdit(editId);
      }
    };
    fetchData();
  }, [enabled, user, router, supabase, editId, loadArchiveDataForEdit]);

  // Effect to fetch the next available nomor_berkas for the user's field
  useEffect(() => {
    if (!enabled) return;

    const fetchNextNomorBerkasForBidang = async () => {
      if (!user?.id_bidang_fkey || editId) return; // Only fetch for new entries with valid user field
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
          .select("nomor_berkas, lokasi_penyimpanan!id_lokasi_fkey!inner(id_bidang_fkey), id_arsip_aktif")
          .eq("lokasi_penyimpanan.id_bidang_fkey", user.id_bidang_fkey);

        if (idsToExclude.length > 0) {
          query = query.not('id_arsip_aktif', 'in', `(${idsToExclude.join(',')})`);
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
  }, [enabled, user, supabase, editId]);

  // Effect to sync auto-generated nomorBerkas to formData.nomor_berkas for new entries
  useEffect(() => {
    if (!editId && nomorBerkas > 0) {
      setFormData(prev => {
        if (prev.nomor_berkas === 0) { 
          return { ...prev, nomor_berkas: nomorBerkas };
        }
        return prev;
      });
    }
  }, [nomorBerkas, editId]);

  // Effect to update kode_klasifikasi and masa_retensi when kodeKlasifikasiMode is 'otomatis'
  useEffect(() => {
    if (kodeKlasifikasiMode === 'otomatis') {
      setFormData(prev => {
        if (!selectedKodeKlasifikasi) return prev;
        if (prev.kode_klasifikasi !== selectedKodeKlasifikasi) {
          return { ...prev, kode_klasifikasi: selectedKodeKlasifikasi };
        }
        return prev;
      });
    }
  }, [selectedKodeKlasifikasi, kodeKlasifikasiMode]);
  // Note: This effect doesn't automatically fetch masa_retensi from klasifikasiList.
  // That logic needs to be added here if desired for the 'otomatis' mode.

  useEffect(() => {
    if (formData.tanggal_penciptaan_mulai) {
      const parts = formData.tanggal_penciptaan_mulai.split('-');
      const tahunCiptaMulai = parseInt(parts[0], 10);

      if (!isNaN(tahunCiptaMulai)) {
        const tanggalMulaiAktif = new Date(tahunCiptaMulai + 1, 0, 1);
        const year = tanggalMulaiAktif.getFullYear();
        const month = (tanggalMulaiAktif.getMonth() + 1).toString().padStart(2, '0');
        const day = tanggalMulaiAktif.getDate().toString().padStart(2, '0');
        const tanggalMulaiAktifStr = `${year}-${month}-${day}`;

        setFormData(prev => ({ ...prev, tanggal_mulai: tanggalMulaiAktifStr }));
      }
    } else {
      setFormData(prev => ({ ...prev, tanggal_mulai: "" }));
    }
  }, [formData.tanggal_penciptaan_mulai]);
  // Note: setFormData is stable and doesn't need to be in the dependency array.

  useEffect(() => {
    if (formData.tanggal_penciptaan_mulai && !formData.tanggal_penciptaan_berakhir) {
        setFormData(prev => ({ ...prev, tanggal_penciptaan_berakhir: formData.tanggal_penciptaan_mulai }));
    }
  }, [formData.tanggal_penciptaan_mulai, formData.tanggal_penciptaan_berakhir]);

  // Helper function to format date to DD-MM-YYYY
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  useEffect(() => {
    // Effect to calculate kurun_waktu based on tanggal_penciptaan_mulai and _berakhir
    if (formData.tanggal_penciptaan_mulai) {
      const [mulaiYear, mulaiMonth, mulaiDay] = formData.tanggal_penciptaan_mulai.split('-').map(Number);
      const tglMulaiCipta = new Date(mulaiYear, mulaiMonth - 1, mulaiDay);

      let kurunWaktuCiptaStr = formatDate(tglMulaiCipta);

      if (formData.tanggal_penciptaan_berakhir) {
        const [akhirYear, akhirMonth, akhirDay] = formData.tanggal_penciptaan_berakhir.split('-').map(Number);
        const tglAkhirCipta = new Date(akhirYear, akhirMonth - 1, akhirDay);

        if (!isNaN(tglAkhirCipta.getTime()) && tglAkhirCipta.getTime() >= tglMulaiCipta.getTime()) {
          kurunWaktuCiptaStr += ` s.d. ${formatDate(tglAkhirCipta)}`;
        }
      }
      setFormData(prev => ({ ...prev, kurun_waktu: kurunWaktuCiptaStr }));
    } else {
        setFormData(prev => ({ ...prev, kurun_waktu: "" }));
    }
  }, [formData.tanggal_penciptaan_mulai, formData.tanggal_penciptaan_berakhir, setFormData]);

  useEffect(() => {
    if (formData.tanggal_mulai) {
      const [year, month, day] = formData.tanggal_mulai.split('-').map(Number);
      const tanggalMulai = new Date(year, month - 1, day);

      if (!isNaN(tanggalMulai.getTime())) {
        let tanggalBerakhir: Date;
        const masaRetensiNum = parseInt(formData.masa_retensi);

        if (formData.masa_retensi && !isNaN(masaRetensiNum) && masaRetensiNum > 0) {
          const tahunBerakhirCalc = tanggalMulai.getFullYear() + masaRetensiNum - 1;
          tanggalBerakhir = new Date(tahunBerakhirCalc, 11, 31);
        } else {
          tanggalBerakhir = new Date(tanggalMulai.getFullYear(), 11, 31);
        }

        const akhirYear = tanggalBerakhir.getFullYear();
        const akhirMonth = (tanggalBerakhir.getMonth() + 1).toString().padStart(2, '0');
        const akhirDay = tanggalBerakhir.getDate().toString().padStart(2, '0');
        const tanggalBerakhirStr = `${akhirYear}-${akhirMonth}-${akhirDay}`;

        const jangkaSimpanStr = `${formatDate(tanggalMulai)} s.d. ${formatDate(tanggalBerakhir)}`;
        setFormData(prev => ({ ...prev, tanggal_berakhir: tanggalBerakhirStr, jangka_simpan: jangkaSimpanStr }));
      }
    } else {
      setFormData(prev => ({ ...prev, tanggal_berakhir: "", jangka_simpan: "" }));
    }
  // setFormData is stable and doesn't need to be in the dependency array.
  }, [formData.tanggal_mulai, formData.masa_retensi]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "nomor_berkas") {
      const numericValue = value === "" ? 0 : parseInt(value, 10); 
      setFormData(prev => ({ ...prev, nomor_berkas: isNaN(numericValue) ? prev.nomor_berkas : numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handler for Kode Klasifikasi selection in 'otomatis' mode
  const handleKodeKlasifikasiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedKodeKlasifikasi(e.target.value);
  };
  // Note: Masa retensi update for 'otomatis' mode should happen in the useEffect above.
  // Hapus handleKodeTambahanChange

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[useBerkasArsipAktif] handleSubmit: setting submitting to true');
    setSubmitting(true);

    try {
      let kodeLengkap = "";
      if (kodeKlasifikasiMode === 'otomatis') {
        kodeLengkap = selectedKodeKlasifikasi;
        console.log('[useBerkasArsipAktif] handleSubmit: Mode Otomatis, kodeLengkap:', kodeLengkap);
        if (!selectedKodeKlasifikasi) {
          toast.error("Kode Klasifikasi harus dipilih dalam mode otomatis.");
          setSubmitting(false);
          return;
        }
      } else {
        kodeLengkap = formData.kode_klasifikasi;
        console.log('[useBerkasArsipAktif] handleSubmit: Mode Manual, kodeLengkap:', kodeLengkap);
        if (!kodeLengkap.trim()) {
            toast.error("Kode Klasifikasi harus diisi.");
            console.log('[useBerkasArsipAktif] handleSubmit: Kode Klasifikasi manual kosong, setting submitting to false');
            setSubmitting(false);
            return;
        }
      }

      // Validate user data before proceeding
      if (!user || !user.id || !user.id_bidang_fkey || !user.daftar_bidang?.nama_bidang) {
        toast.warning("Sesi pengguna tidak valid atau data bidang tidak lengkap.");
        console.log('[useBerkasArsipAktif] handleSubmit: User data invalid, setting submitting to false');
        setSubmitting(false);
        return;
      }

      // Handle Location (check existing or create new)
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
          console.log('[useBerkasArsipAktif] handleSubmit: Gagal memeriksa lokasi, setting submitting to false. Error:', lokErr);
          setSubmitting(false); return;
        }
        if (existingLokasi) {
          idLokasiFkey = existingLokasi.id_lokasi;
        } else {
          const { data: newLokasi, error: insertLokErr } = await supabase
            .from("lokasi_penyimpanan")
            .insert({ id_bidang_fkey: user.id_bidang_fkey, ...calculatedLocation })
            .select("id_lokasi").single();
          if (insertLokErr || !newLokasi) {
            toast.error("Gagal membuat entri lokasi baru.");
            console.log('[useBerkasArsipAktif] handleSubmit: Gagal insert lokasi baru, setting submitting to false. Error:', insertLokErr);
            setSubmitting(false); return;
          }
          idLokasiFkey = newLokasi.id_lokasi;
        }
      }

      // Determine final Nomor Berkas
      let finalNomorBerkas: number;
      if (editId) {
        if (formData.nomor_berkas === 0) {
          toast.error("Nomor Berkas tidak boleh kosong untuk berkas yang diedit.");
          console.log('[useBerkasArsipAktif] handleSubmit (edit): Nomor Berkas kosong, setting submitting to false');
          setSubmitting(false); return;
        }
        finalNomorBerkas = formData.nomor_berkas;
      } else {
        finalNomorBerkas = formData.nomor_berkas !== 0 ? formData.nomor_berkas : nomorBerkas;
        if (finalNomorBerkas === 0) {
            toast.error("Nomor Berkas tidak valid. Coba refresh atau isi manual.");
            console.log('[useBerkasArsipAktif] handleSubmit (new): Nomor Berkas invalid (0), setting submitting to false');
            setSubmitting(false); return;
        }
      }

      // Prepare data to save
      const berkasDataToSave = {
        kode_klasifikasi: kodeLengkap,
        uraian_informasi: formData.uraian_informasi,
        masa_retensi: formData.masa_retensi ? parseInt(formData.masa_retensi) : null,
        kurun_waktu: formData.kurun_waktu,
        jangka_simpan: formData.jangka_simpan,
        jumlah: formData.jumlah ? parseInt(formData.jumlah) : null, 
        keterangan: formData.keterangan,
        tingkat_perkembangan: formData.tingkat_perkembangan,
        media_simpan: formData.media_simpan,
        akses: formData.akses,
        user_id: user.id,
        nomor_berkas: finalNomorBerkas,
        id_lokasi_fkey: idLokasiFkey,
      };

      // Perform Insert or Update
      const targetTable = "arsip_aktif";
      const idColumn = "id_arsip_aktif";

      if (editId) {
        // Update existing record
        const { error: updateError } = await supabase
          .from(targetTable)
          .update(berkasDataToSave)
          .eq(idColumn, editId);
        if (updateError) {
          console.error('[useBerkasArsipAktif] handleSubmit: Gagal update berkas. Error:', updateError);
          toast.error('Gagal memperbarui data berkas.');
        } else {
          await supabase.from('draft_input_berkas_arsip').delete().eq('user_id', user.id);
          toast.success('Berkas berhasil diperbarui!');
          router.push(`/arsip/arsip-aktif/detail/${editId}`); 
        }
      } else {
        // Insert new record
        const { data: insertedData, error: insertError } = await supabase
          .from(targetTable)
          .insert([berkasDataToSave])
          .select()
          .single();
        if (insertError) {
          console.error('[useBerkasArsipAktif] handleSubmit: Gagal insert berkas. Error:', insertError);
          toast.error('Gagal menyimpan data berkas.');
        } else {
          await supabase.from('draft_input_berkas_arsip').delete().eq('user_id', user.id);
          toast.success(`Berkas dengan nomor ${berkasDataToSave.nomor_berkas} berhasil disimpan!`);
          setNomorBerkas(prev => prev + 1);
          resetFormForNewEntry();
          const berkasId = insertedData?.[idColumn];
          // Send notification if successful insert and user field is available
          if (berkasId && user.id_bidang_fkey) {
            sendDepartmentHeadNotification(
                user.id_bidang_fkey,
                "Permintaan Persetujuan Berkas Baru", 
                `Berkas baru dengan kode klasifikasi ${kodeLengkap} telah ditambahkan dan menunggu persetujuan.`,
                "/unit-pengolah/verifikasi-arsip", 
                "verifikasi berkas aktif", 
            ).catch(notifError => {
              console.warn("Pengiriman notifikasi gagal (latar belakang):", notifError);
              toast.warn("Berkas disimpan, notifikasi ke Kepala Bidang gagal.");
            });
          }
        }
      }
    } catch (error) {
      // Catch any errors during the submit process
      console.error('[useBerkasArsipAktif] handleSubmit: Catch block error:', error);
      toast.error('Terjadi kesalahan saat menyimpan data berkas.');
    } finally {
      // Always reset submitting state
      console.log('[useBerkasArsipAktif] handleSubmit: finally block, setting submitting to false');
      setSubmitting(false);
    }
  };
  // Handler to cancel the submit process (currently just resets submitting state)
  const handleCancelSubmit = () => {
    setSubmitting(false);
    console.log('[useBerkasArsipAktif] handleCancelSubmit: setting submitting to false');
    toast.info("Proses penyimpanan dibatalkan.");
  };

  const handleManualKodeKlasifikasiBlur = async () => {
    // Logic to find masa_retensi when kode_klasifikasi is entered manually
    if (kodeKlasifikasiMode === 'manual' && formData.kode_klasifikasi.trim() !== "") {
      const kodeInputUser = formData.kode_klasifikasi.trim();
      const toastId = toast.loading("Mencari data klasifikasi...");
      try {
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new GlobalTimeoutError(`Pencarian data klasifikasi untuk '${kodeInputUser}' melebihi batas waktu ${SUPABASE_QUERY_TIMEOUT_MS}ms.`)), SUPABASE_QUERY_TIMEOUT_MS)
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
        if (error instanceof GlobalTimeoutError) {
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
    submitting: submitting,
    klasifikasiList,
    selectedKodeKlasifikasi, 
    calculatedLocation,
    handleChange,
    handleKodeKlasifikasiChange, 
    handleSubmit,
    handleCancelSubmit,
    router,
    kodeKlasifikasiMode,
    setKodeKlasifikasiMode,    
    handleManualKodeKlasifikasiBlur,
    handleRefreshDraft, 
  };
}