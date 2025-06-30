import { useState, useCallback, useRef, useEffect } from "react";
import { SuratAlihMediaData } from "../types";
import { useRouter } from "next/navigation";
import { processSuratAlihMedia, fetchPdfFromUrl } from "@/utils/ocrArsipAlihMedia";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import { pdf } from "@react-pdf/renderer";
import { AlihMediaPDF } from "../components/AlihMediaPDF";
import * as pdfjsLib from "pdfjs-dist";
import { useAlihMediaFormDraft } from "../hooks/useAlihMediaFormDraft";

const DEFAULT_KOP = {
    logoUrl: "/logosumsel.png",
    instansi1: "PEMERINTAH PROVINSI SUMATERA SELATAN",
    instansi2: "DINAS KEARSIPAN",
    alamat: "Jalan Demang Lebar Daun Nomor 4863 Palembang",
    kontak: "Telepon : (0711) 364843 Faximile : (0711) 364843 Kode Pos 30137",
    emailWeb: "e-mail : dinaskearsipan.provsumsel@gmail.com, Website : www.dinaskearsipan.wordpress.com",
};

interface UseAlihMediaFormOptions {
    onOcrSuccess?: (data: Partial<SuratAlihMediaData>) => void;
    onOcrError?: (error: Error) => void;
    onProgress?: (progress: number) => void;
    isiArsipId?: string | null;
    fileUrl?: string | null;
    enabled?: boolean;
}

export function useAlihMediaForm(options: UseAlihMediaFormOptions = {}) {
    const { onOcrSuccess, onOcrError, onProgress, isiArsipId, fileUrl: initialFileUrl, enabled = false } = options;
    const supabase = createClient();
    const { user } = useAuth();
    const router = useRouter();

    const [data, setData] = useState<SuratAlihMediaData>({
        ...DEFAULT_KOP,
        tanggal: "",
        nomor: "",
        sifat: "",
        lampiran: "",
        hal: "",
        kepada: "",
        di: "",
        isi: [""],
        penutup: "",
        ttdJabatan: "",
        ttdNama: "",
        ttdPangkat: "",
        ttdNip: "",
        qrUrl: "",
    });

    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [fileUrl, setFileUrl] = useState<string | null>(initialFileUrl || null);

    // Ref untuk cancel OCR operation
    const ocrAbortController = useRef<AbortController | null>(null);

    // Cleanup preview URL
    const cleanupPreviewUrl = useCallback(() => {
        if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
        }
    }, [pdfPreviewUrl]);

    // Form validation
    const validateForm = useCallback((): boolean => {
        const requiredFields = ['tanggal', 'nomor', 'hal', 'kepada'] as const;
        for (const field of requiredFields) {
            if (!data[field]?.trim()) {
                setOcrError(`Field ${field} harus diisi`);
                return false;
            }
        }
        if (data.isi.every(p => !p.trim())) {
            setOcrError('Isi surat harus diisi');
            return false;
        }
        setOcrError(null);
        return true;
    }, [data]);

    // Reset form
    const resetForm = useCallback(() => {
        setData({
            ...DEFAULT_KOP,
            tanggal: "",
            nomor: "",
            sifat: "",
            lampiran: "",
            hal: "",
            kepada: "",
            di: "",
            isi: [""],
            penutup: "",
            ttdJabatan: "",
            ttdNama: "",
            ttdPangkat: "",
            ttdNip: "",
            qrUrl: "",
        });
        setPdfFile(null);
        cleanupPreviewUrl();
        setOcrError(null);
        setOcrProgress(0);
    }, [cleanupPreviewUrl]);

    // Validate PDF file
    const validatePdfFile = useCallback((file: File): boolean => {
        if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
            setOcrError('File harus berformat PDF');
            return false;
        }
        if (file.size > 15 * 1024 * 1024) {
            setOcrError('Ukuran file maksimal 15MB');
            return false;
        }
        setOcrError(null);
        return true;
    }, []);

    // Handle PDF upload
    const handlePdfUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!validatePdfFile(file)) return;
        // Jangan revoke url preview lama sebelum file baru benar-benar di-set dan preview selesai
        if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
        }
        setPdfFile(file);
        setPdfPreviewUrl(URL.createObjectURL(file));
        setOcrError(null);
    }, [validatePdfFile, pdfPreviewUrl]);

    // Internal OCR progress handler
    const handleOcrProgress = useCallback((progress: number) => {
        setOcrProgress(progress);
        onProgress?.(progress);
    }, [onProgress]);

    // Ambil saveDraft dari hook draft (user id otomatis dari context)
    const { saveDraft } = useAlihMediaFormDraft(
        data,                
        isiArsipId || null,  
        setData              
    );

    // Proses OCR HANYA saat tombol diklik, baik file hasil upload/manual, maupun dari fileUrl
    const handleOcr = useCallback(async () => {
        let fileToProcess = pdfFile;
        if (!fileToProcess && fileUrl) {
            // Fetch file dari url jika pdfFile belum ada
            try {
                const fetchedFile = await fetchPdfFromUrl(fileUrl);
                setPdfFile(fetchedFile);
                setPdfPreviewUrl(URL.createObjectURL(fetchedFile));
                fileToProcess = fetchedFile;
            } catch (error) {
                setOcrError('Gagal mengunduh file arsip untuk OCR: ' + (error instanceof Error ? error.message : String(error)));
                return;
            }
        }
        if (!fileToProcess) {
            setOcrError('Tidak ada file PDF yang dipilih atau tersedia untuk diproses.');
            return;
        }
        if (ocrAbortController.current) {
            ocrAbortController.current.abort();
        }
        ocrAbortController.current = new AbortController();
        setOcrLoading(true);
        setOcrError(null);
        setOcrProgress(0);

        try {
            // --- Tambahan: Deteksi PDF Digital ---
            const arrayBuffer = await fileToProcess.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let hasSelectableText = false;
            for (let pageNum = 1; pageNum <= Math.min(pdfDoc.numPages, 3); pageNum++) {
                const page = await pdfDoc.getPage(pageNum);
                const textContent = await page.getTextContent();
                const textItems = textContent.items as any[];
                const text = textItems.map(item => item.str).join('').replace(/\s/g, '');
                if (text.length > 50) {
                    hasSelectableText = true;
                    break;
                }
            }
            if (hasSelectableText) {
                toast.error('File PDF ini sudah digital (ada teks yang bisa diseleksi), tidak perlu dialihmediakan.');
                setOcrError('File PDF ini sudah digital (ada teks yang bisa diseleksi), tidak perlu dialihmediakan.');
                setOcrLoading(false);
                // Reset form agar user tidak bisa lanjut
                resetForm();
                setPdfFile(null);
                setPdfPreviewUrl(null);
                return;
            }
            // --- End Tambahan ---

            const partial = await processSuratAlihMedia(fileToProcess, handleOcrProgress);
            setData(prev => {
                const newData = {
                    ...prev,
                    ...partial, // Apply all extracted fields
                    isi: partial.isi && partial.isi.length > 0 ? partial.isi : [""]
                };
                console.log('arsipId', isiArsipId, 'data', newData);
                saveDraft(newData);
                saveDraft.flush(); // pastikan langsung eksekusi
                return newData;
            });
            onOcrSuccess?.(partial);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat pemrosesan OCR';
            setOcrError(errorMessage);
            onOcrError?.(error instanceof Error ? error : new Error(errorMessage));
            console.error("OCR Error:", error);
        } finally {
            setOcrLoading(false);
            ocrAbortController.current = null;
        }
    }, [pdfFile, fileUrl, handleOcrProgress, onOcrSuccess, onOcrError, saveDraft]);

    // Cancel OCR operation
    const cancelOcr = useCallback(() => {
        if (ocrAbortController.current) {
            ocrAbortController.current.abort();
            ocrAbortController.current = null;
        }
        setOcrLoading(false);
        setOcrProgress(0);
    }, []);

    // Handle Save Alih Media
    const handleSave = useCallback(async () => {
        if (!enabled) {
            toast.warn("Form tidak aktif, menunggu proses autentikasi...");
            return;
        }
        if (!isiArsipId) {
            toast.error("ID Arsip tidak ditemukan. Tidak dapat menyimpan.");
            return;
        }
        if (!user) {
            toast.error("Sesi tidak valid. Harap login kembali.");
            return;
        }
        if (!validateForm()) return;

        setSubmitting(true);
        toast.info("Memulai proses penyimpanan alih media...");

        try {
            // 1. Generate PDF baru dari data form
            const pdfBlob = await pdf(<AlihMediaPDF data={data} />).toBlob();
            const fileName = `alih_media_${data.hal.replace(/[\\\/]/g, '_')}_${Date.now()}.pdf`;
            const filePath = `alih_media/${fileName}`;

            // 2. Upload PDF baru ke Supabase Storage
            toast.info("Mengunggah file PDF baru...");
            const { error: uploadError } = await supabase.storage
                .from('arsip')
                .upload(filePath, pdfBlob, { upsert: true });

            if (uploadError) throw new Error(`Gagal mengunggah PDF: ${uploadError.message}`);

            const { data: { publicUrl: newFileUrl } } = supabase.storage
                .from('arsip')
                .getPublicUrl(filePath);

            if (!newFileUrl) throw new Error("Gagal mendapatkan URL publik untuk PDF yang baru.");

            // 3. Simpan data ke tabel alih_media_isi_arsip
            toast.info("Menyimpan hasil alih media...");
            const { error: alihMediaError } = await supabase
                .from('alih_media_isi_arsip')
                .insert({
                    id_isi_arsip_fkey: isiArsipId,
                    hasil_ocr_json: data,
                    file_url: newFileUrl,
                    created_by: user.id,
                    status: 'selesai'
                });

            if (alihMediaError) throw new Error(`Gagal menyimpan data alih media: ${alihMediaError.message}`);

            // 4. Update file_url di tabel isi_berkas_arsip
            toast.info("Memperbarui file arsip asli...");
            const { error: updateArsipError } = await supabase
                .from('isi_berkas_arsip')
                .update({ file_url: newFileUrl })
                .eq('id_isi_arsip', isiArsipId);

            if (updateArsipError) throw new Error(`Gagal memperbarui URL file arsip asli: ${updateArsipError.message}`);

            // Hapus draft setelah submit sukses
            await supabase.from("draft_input_alih_media").delete().eq("user_id", user.id);

            toast.success("Data alih media berhasil disimpan dan file arsip telah diperbarui!");
            if (isiArsipId) {
                router.push(`/arsip/detail-item/${isiArsipId}`);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan tidak diketahui.";
            console.error("Save Alih Media Error:", error);
            toast.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    }, [enabled, isiArsipId, user, data, supabase, validateForm, pdf, router]);

    // Handle form field changes
    const handleChange = useCallback(<K extends keyof SuratAlihMediaData>(
        key: K,
        value: SuratAlihMediaData[K]
    ) => {
        setData(prev => ({ ...prev, [key]: value }));
    }, []);

    // Handle isi array changes
    const handleIsiChange = useCallback((idx: number, value: string) => {
        setData(prev => {
            const isi = [...prev.isi];
            isi[idx] = value;
            return { ...prev, isi };
        });
    }, []);

    // Add new isi paragraph
    const addIsiParagraph = useCallback(() => {
        setData(prev => ({
            ...prev,
            isi: [...prev.isi, ""]
        }));
    }, []);

    // Remove isi paragraph
    const removeIsiParagraph = useCallback((idx: number) => {
        setData(prev => ({
            ...prev,
            isi: prev.isi.filter((_, i) => i !== idx)
        }));
    }, []);

    // Untuk page: setter fileUrl agar bisa dioper dari luar
    const setFileUrlFromPage = useCallback((url: string | null) => {
        setFileUrl(url);
    }, []);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) {
                URL.revokeObjectURL(pdfPreviewUrl);
            }
            if (ocrAbortController.current) {
                ocrAbortController.current.abort();
            }
        };
    }, [pdfPreviewUrl]);

    // Jika fileUrl berubah, fetch preview (tanpa OCR)
    useEffect(() => {
        if (fileUrl) {
            fetchPdfFromUrl(fileUrl)
                .then((fetchedFile: File) => {
                    setPdfFile(fetchedFile);
                    if (pdfPreviewUrl) {
                        URL.revokeObjectURL(pdfPreviewUrl);
                    }
                    setPdfPreviewUrl(URL.createObjectURL(fetchedFile));
                })
                .catch((err: any) => setOcrError('Gagal menampilkan file arsip: ' + (err?.message ?? String(err))));
        }
    }, [fileUrl]);

    return {
        data,
        setData,
        pdfFile,
        pdfPreviewUrl,
        ocrLoading,
        ocrProgress,
        ocrError,
        submitting,
        handlePdfUpload,
        handleOcr,
        cancelOcr,
        handleChange,
        handleIsiChange,
        addIsiParagraph,
        removeIsiParagraph,
        resetForm,
        validateForm,
        handleSave,
        cleanupPreviewUrl,
        setFileUrlFromPage, 
        fileUrl,
    };
}