// d:\Project\ocr-arsip\app\arsip\pemindahan\detail\[id]\page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import { ArrowLeft, FileText, User, Calendar, CheckCircle, Clock, Info, Archive, Building, Box, Download } from "lucide-react";
import Link from "next/link";
import { SIGN_IN_PATH } from "../../utils"; // Sesuaikan path
import { ArsipAktif, BeritaAcara, PemindahanInfo, ApprovalStatus as IApprovalStatus, ProcessStatus } from "../../types"; // Sesuaikan path
import { pdf } from '@react-pdf/renderer'; // Import untuk PDF
import { BeritaAcaraPDF } from '../../components/BeritaAcaraPDF'; // Import komponen PDF

// Definisikan PemindahanProcess di sini jika belum ada di types.ts atau path impor salah
// Jika sudah ada di types.ts dan path impor benar, Anda bisa menghapus definisi ini
// dan memastikan types.ts diekspor dengan benar.
interface PemindahanProcess {
    id: string;
    user_id: string;
    current_step: number;
    berita_acara: BeritaAcara | null; // Gunakan tipe BeritaAcara yang sudah diimpor
    pemindahan_info: PemindahanInfo | null; // Tambahkan ini
    approval_status: IApprovalStatus | null; // Gunakan tipe IApprovalStatus yang sudah diimpor
    process_status: ProcessStatus | null; // Gunakan tipe ProcessStatus yang sudah diimpor
    is_completed: boolean;
    created_at: string;
    updated_at: string;
    selected_arsip_ids?: string[] | null; // Tambahkan ini jika ada di tabel
    user?: { // Tambahkan user untuk menampilkan nama pengaju
        nama: string;
    } | null; // User bisa null jika join gagal
    // Tambahkan info untuk penandatangan PDF
    pengaju_info?: UserInfoPDF;
    kepala_bidang_info?: UserInfoPDF;
    sekretaris_info?: UserInfoPDF;
}

interface ProcessDetail extends PemindahanProcess {
    combined_arsip_details?: CombinedArsipData[];
}

interface UserInfoPDF { // Tipe untuk data penandatangan di PDF
    nama: string;
    nip: string;
    jabatan: string;
    bidang: string;
    pangkat?: string; // Tambahkan pangkat, opsional
}

export interface CombinedArsipData {
    id_arsip_aktif: string;
    id_arsip_inaktif?: string;
    nomor_berkas: string;
    kode_klasifikasi: string; // Dari arsip_inaktif
    jenis_arsip: string; // Dari arsip_inaktif    
    uraian_informasi: string;
    jumlah: number;
    kurun_waktu_penciptaan: string; // Dari kurun_waktu arsip_inaktif (yang asalnya dari arsip_aktif)
    jangka_simpan_aktif_periode: string; // Dari jangka_simpan arsip_aktif (periode DD-MM-YYYY s.d DD-MM-YYYY)
    jangka_simpan_inaktif_periode: string; // Dari jangka_simpan arsip_inaktif (periode DD-MM-YYYY s.d DD-MM-YYYY)
    nasib_akhir: string;
}


const formatDate = (dateString: string | null | undefined, includeTime = false) => {
    if (!dateString) return "N/A";
    const options: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "long",
        year: "numeric",
    };
    if (includeTime) {
        options.hour = "2-digit";
        options.minute = "2-digit";
    }
    return new Date(dateString).toLocaleDateString("id-ID", options);
};

// Loading Skeleton Component for Detail Page
const DetailLoadingSkeleton = () => {
    return (
        <div className="w-full h-full p-6">
            <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col animate-pulse">
                    {/* Header Skeleton */}
                    <div className="bg-primary/10 px-6 py-4 flex justify-between items-center rounded-lg">
                        <div className="h-8 w-1/3 bg-primary/20 rounded"></div>
                        <div className="flex gap-3">
                            <div className="h-9 w-24 bg-primary/20 rounded"></div> {/* Tombol Kembali */}
                            <div className="h-9 w-32 bg-primary/20 rounded"></div> {/* Tombol Unduh PDF */}
                        </div>
                    </div>

                    <div className="p-6 flex-grow overflow-y-auto">
                        {/* Section Skeleton */}
                        {[...Array(3)].map((_, sectionIndex) => (
                            <div key={sectionIndex} className="mb-8">
                                <div className="h-7 w-1/4 bg-muted/50 rounded mb-5"></div> {/* Section Title */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                    {[...Array(3)].map((_, itemIndex) => (
                                        <div key={itemIndex} className="space-y-2">
                                            <div className="h-5 w-1/3 bg-muted/50 rounded"></div> {/* Label */}
                                            <div className="h-5 w-2/3 bg-muted/50 rounded"></div> {/* Value */}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {/* Table Skeleton (jika ada) */}
                        <div className="mt-8">
                            <div className="h-7 w-1/4 bg-muted/50 rounded mb-5"></div> {/* Table Title */}
                            <div className="h-40 bg-muted/40 rounded-lg"></div> {/* Table Placeholder */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function PemindahanDetailPage() {
    const supabase = createClient();
    const router = useRouter();
    const params = useParams();
    const processId = params.id as string;

    const [detail, setDetail] = useState<ProcessDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true);
    const [isClient, setIsClient] = useState(false); // Untuk PDFDownloadLink

    useEffect(() => {
        const checkAuth = async () => {
            setAuthLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push(SIGN_IN_PATH);
                return;
            }
            // Anda bisa menambahkan pengecekan peran di sini jika diperlukan
            setAuthLoading(false);
        };
        setIsClient(true); // Set isClient menjadi true setelah mount
        checkAuth();
    }, [router, supabase]);

    useEffect(() => {
        if (!processId || authLoading) return;

        const fetchDetail = async () => {
            setLoading(true);
            try {
                const { data: processData, error } = await supabase
                    .from("pemindahan_process")
                    .select(`
            *, 
            selected_arsip_ids,
            user:users (nama)
          `)
                    .eq("id", processId)
                    .single();

                if (error || !processData) {
                    toast.error("Gagal memuat detail proses pemindahan.");
                    console.error("Error fetching detail:", error);
                    router.push("/arsip/pemindahan/riwayat"); // Kembali ke riwayat jika error
                    return;
                }

                // Pastikan data yang diterima dari Supabase sesuai dengan PemindahanProcess
                // dan kemudian cast ke ProcessDetail.
                // Ambil juga user_id dari processData untuk mengambil detail penandatangan
                console.log("[LOG FETCH DETAIL] processData mentah:", processData);
                const mappedProcessData: PemindahanProcess = {
                    ...processData,
                    // Supabase mungkin mengembalikan user sebagai array, kita ambil yang pertama
                    user_id: processData.user_id, // Pastikan user_id ada
                    user: Array.isArray(processData.user) && processData.user.length > 0 ? processData.user[0] : (processData.user || null),
                    // Pastikan properti lain ada atau null
                    berita_acara: processData.berita_acara || null,
                    pemindahan_info: processData.pemindahan_info || null,
                    approval_status: processData.approval_status || null,
                    process_status: processData.process_status || null,
                };

                let enrichedData: ProcessDetail = mappedProcessData as ProcessDetail;

                // Ambil detail arsip jika ada selected_arsip_ids
                if (processData.selected_arsip_ids && processData.selected_arsip_ids.length > 0) {
                    try {
                        // Ambil data dari arsip_inaktif berdasarkan id_arsip_aktif
                        const { data: arsipInaktifDetails, error: arsipInaktifError } = await supabase
                            .from("arsip_inaktif")
                            .select("*")
                            .in("id_arsip_aktif", processData.selected_arsip_ids);

                        if (arsipInaktifError) {
                            console.warn("Gagal memuat detail arsip inaktif:", arsipInaktifError.message);
                        }

                        // Ambil data dari arsip_aktif untuk mendapatkan info masa retensi aktif
                        const { data: arsipAktifDetails, error: arsipAktifError } = await supabase
                            .from("arsip_aktif")
                            .select("*")
                            .in("id_arsip_aktif", processData.selected_arsip_ids);

                        if (arsipAktifError) {
                            console.warn("Gagal memuat detail arsip aktif:", arsipAktifError.message);
                        }
                        // Gabungkan data
                        if (arsipInaktifDetails && arsipAktifDetails) {
                            const combinedData: CombinedArsipData[] = arsipInaktifDetails.map(inaktif => {
                                const aktif = arsipAktifDetails.find(a => a.id_arsip_aktif === inaktif.id_arsip_aktif);

                                // jangka_simpan di arsip_inaktif sudah berisi periode "DD-MM-YYYY s.d. DD-MM-YYYY"
                                // masa_retensi di arsip_inaktif berisi nilai tahun
                                // kurun_waktu di arsip_inaktif berisi periode penciptaan asli
                                
                                return {
                                    id_arsip_aktif: inaktif.id_arsip_aktif,
                                    id_arsip_inaktif: inaktif.id_arsip_inaktif,
                                    nomor_berkas: inaktif.nomor_berkas.toString(),
                                    kode_klasifikasi: inaktif.kode_klasifikasi,
                                    jenis_arsip: inaktif.jenis_arsip,
                                    uraian_informasi: aktif?.uraian_informasi || '',
                                    jumlah: inaktif.jumlah,
                                    jangka_simpan_aktif_periode: aktif?.jangka_simpan || '-', // Periode aktif dari arsip_aktif
                                    kurun_waktu_penciptaan: inaktif.kurun_waktu || '-', // Periode penciptaan asli
                                    jangka_simpan_inaktif_periode: inaktif.jangka_simpan || '-', // Periode inaktif "DD-MM-YYYY s.d. DD-MM-YYYY"
                                    nasib_akhir: inaktif.nasib_akhir
                                };
                            });
                            
                            // Debugging log
                            console.log("[LOG FETCH DETAIL] Combined Data for Table:", combinedData);
                            combinedData.forEach(item => {
                                console.log(`[LOG ITEM] Berkas: ${item.nomor_berkas}, Jangka Simpan Aktif: ${item.jangka_simpan_aktif_periode}, Jangka Simpan Inaktif: ${item.jangka_simpan_inaktif_periode}`);
                            });
                            enrichedData.combined_arsip_details = combinedData;
                        }
                    } catch (error) {
                        console.error("Error fetching combined arsip data:", error);
                    }
                }
                // Data default untuk penandatangan PDF jika tidak ada data dari database
                const defaultUserInfoPDF: UserInfoPDF = {
                    nama: 'N/A',
                    nip: 'N/A',
                    jabatan: 'N/A',
                    bidang: 'N/A',
                    pangkat: 'N/A' // Tambahkan pangkat
                };

                // Ambil data untuk penandatangan PDF
                // 1. Pengaju (dari processData.user_id)
                if (processData.user_id) {
                    const { data: pengajuData } = await supabase
                        .from('users')
                        .select('nama, nip, jabatan, pangkat, bidang:daftar_bidang(nama_bidang)')
                        .eq('user_id', processData.user_id)
                        .single();

                    if (pengajuData) {
                        enrichedData.pengaju_info = {
                            nama: pengajuData.nama || 'N/A',
                            nip: pengajuData.nip || 'N/A',
                            jabatan: pengajuData.jabatan || 'N/A',
                            bidang: (pengajuData.bidang as any)?.nama_bidang || 'N/A',
                            pangkat: pengajuData.pangkat || 'N/A',
                        };
                    } else {
                        console.log("[LOG FETCH DETAIL] Tidak ada data pengaju untuk user_id:", processData.user_id);
                        enrichedData.pengaju_info = { ...defaultUserInfoPDF, nama: 'Pengaju', pangkat: 'N/A' };
                    }
                } else {
                    console.log("[LOG FETCH DETAIL] Tidak ada user_id di processData untuk mengambil info pengaju.");
                    // Tetapkan nilai default untuk pengaju jika tidak ada user_id
                    enrichedData.pengaju_info = { ...defaultUserInfoPDF, nama: 'Pengaju', pangkat: 'N/A' };
                }

                // Variabel untuk menyimpan bidang pengaju (untuk digunakan dalam fallback)
                const bidangPengaju = enrichedData.pengaju_info?.bidang || 'N/A';

                // 2. Kepala Bidang (Pihak Pertama yang Menyerahkan)
                try {
                    const kabidVerifierId = processData.approval_status?.kepala_bidang?.verified_by;
                    if (kabidVerifierId) {
                        const { data: kabidData } = await supabase
                            .from('users')
                            .select('nama, nip, jabatan, pangkat, bidang:daftar_bidang(nama_bidang)')
                            .eq('user_id', kabidVerifierId)
                            .single();

                        if (kabidData) {
                            enrichedData.kepala_bidang_info = {
                                nama: kabidData.nama || 'Kepala Bidang',
                                nip: kabidData.nip || '-',
                                jabatan: kabidData.jabatan || 'Kepala Bidang',
                                bidang: (kabidData.bidang as any)?.nama_bidang || bidangPengaju,
                                pangkat: kabidData.pangkat || 'N/A'
                            };
                        } else {
                            console.log("[LOG FETCH DETAIL] Data Kepala Bidang tidak ditemukan untuk kabidVerifierId:", kabidVerifierId, "Menggunakan fallback.");
                            enrichedData.kepala_bidang_info = {
                                nama: 'Kepala Bidang Ybs.',
                                nip: '-',
                                jabatan: 'Kepala Bidang',
                                bidang: bidangPengaju,
                                pangkat: 'N/A'
                            };
                        }
                    } else {
                        // Fallback jika verified_by tidak ada
                        enrichedData.kepala_bidang_info = {
                            nama: 'Kepala Bidang Ybs.',
                            nip: '-',
                            jabatan: 'Kepala Bidang',
                            bidang: bidangPengaju,
                            pangkat: 'N/A'
                        };
                    }
                } catch (error) {
                    console.error("[LOG FETCH DETAIL] Error saat mengambil data Kepala Bidang:", error);
                    enrichedData.kepala_bidang_info = {
                        nama: 'Kepala Bidang Ybs.',
                        nip: '-',
                        jabatan: 'Kepala Bidang',
                        bidang: bidangPengaju,
                        pangkat: 'N/A'
                    };
                }

                // 3. Sekretaris (Pihak Kedua yang Menerima)
                try {
                    const sekreVerifierId = processData.approval_status?.sekretaris?.verified_by;
                    if (sekreVerifierId) {
                        const { data: sekreData } = await supabase
                            .from('users')
                            .select('nama, nip, jabatan, pangkat, bidang:daftar_bidang(nama_bidang)')
                            .eq('user_id', sekreVerifierId)
                            .single();

                        // Untuk bidang sekretaris, kita bisa set default jika tidak ada relasi bidang spesifik
                        const bidangSekretaris = (sekreData?.bidang as any)?.nama_bidang || 'Unit Kearsipan';

                        if (sekreData) {
                            enrichedData.sekretaris_info = {
                                nama: sekreData.nama || 'Sekretaris',
                                nip: sekreData.nip || '-',
                                jabatan: sekreData.jabatan || 'Sekretaris',
                                bidang: bidangSekretaris,
                                pangkat: sekreData.pangkat || 'N/A'
                            };
                        } else {
                            console.log("[LOG FETCH DETAIL] Data Sekretaris tidak ditemukan untuk sekreVerifierId:", sekreVerifierId, "Menggunakan fallback.");
                            enrichedData.sekretaris_info = {
                                nama: 'Sekretaris Ybs.',
                                nip: '-',
                                jabatan: 'Sekretaris',
                                bidang: 'Unit Kearsipan',
                                pangkat: 'N/A'
                            };
                        }
                    } else {
                        // Fallback
                        enrichedData.sekretaris_info = {
                            nama: 'Sekretaris Ybs.',
                            nip: '-',
                            jabatan: 'Sekretaris',
                            bidang: 'Unit Kearsipan',
                            pangkat: 'N/A'
                        };
                    }
                } catch (error) {
                    console.error("[LOG FETCH DETAIL] Error saat mengambil data Sekretaris:", error);
                    enrichedData.sekretaris_info = {
                        nama: 'Sekretaris Ybs.',
                        nip: '-',
                        jabatan: 'Sekretaris',
                        bidang: 'Unit Kearsipan',
                        pangkat: 'N/A'
                    };
                }

                // Pastikan semua data penandatangan tersedia
                if (!enrichedData.pengaju_info) {
                    enrichedData.pengaju_info = {
                        nama: 'Pengaju',
                        nip: '-',
                        jabatan: 'Staff',
                        bidang: 'N/A',
                        pangkat: 'N/A'
                    };
                }

                if (!enrichedData.kepala_bidang_info) {
                    enrichedData.kepala_bidang_info = {
                        nama: 'Kepala Bidang Ybs.',
                        nip: '-',
                        jabatan: 'Kepala Bidang',
                        bidang: enrichedData.pengaju_info.bidang || 'N/A',
                        pangkat: 'N/A'
                    };
                }

                if (!enrichedData.sekretaris_info) {
                    enrichedData.sekretaris_info = {
                        nama: 'Sekretaris Ybs.',
                        nip: '-',
                        jabatan: 'Sekretaris',
                        bidang: 'Unit Kearsipan',
                        pangkat: 'N/A'
                    };
                }

                setDetail(enrichedData);
            } catch (err) {
                toast.error("Terjadi kesalahan saat memuat detail.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [processId, authLoading, supabase, router]);

    if (authLoading || loading) {
        return (
            <DetailLoadingSkeleton />
        );
    }

    if (!detail) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <p className="text-xl text-gray-600">Detail proses tidak ditemukan.</p>
                <div className="mt-6">
                    <Link href="/arsip/pemindahan/riwayat" className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium">
                        Kembali ke Riwayat
                    </Link>
                </div>
            </div>
        );
    }

    const ba = detail.berita_acara as BeritaAcara | null;
    const pi = detail.pemindahan_info as PemindahanInfo | null;
    const as = detail.approval_status as IApprovalStatus | null;
    const ps = detail.process_status as ProcessStatus | null;

    const sortedArsipDetails = detail.combined_arsip_details
        ? [...detail.combined_arsip_details].sort((a, b) => {
            const nomorBerkasA = parseInt(a.nomor_berkas, 10);
            const nomorBerkasB = parseInt(b.nomor_berkas, 10);
            const klasA = a.kode_klasifikasi.toLowerCase();
            const klasB = b.kode_klasifikasi.toLowerCase();
            const jenisA = a.jenis_arsip.toLowerCase();
            const jenisB = b.jenis_arsip.toLowerCase();

            if (nomorBerkasA < nomorBerkasB) return -1;
            if (nomorBerkasA > nomorBerkasB) return 1;
            if (klasA < klasB) return -1;
            if (klasA > klasB) return 1;
            return jenisA.localeCompare(jenisB);
        })
        : [];

    const pdfFileName = `BA_Pemindahan_${ba?.nomor_berita_acara?.replace(/\//g, '_') || detail.id}.pdf`;

    const handleDownloadPdf = async () => {
        try {
            if (!detail || !ba || !pi || !detail.combined_arsip_details) {
                toast.error("Data tidak lengkap untuk membuat PDF");
                return;
            }

            // Pastikan semua info penandatangan tersedia dengan nilai default jika tidak ada
            const defaultUserInfoPDF: UserInfoPDF = { nama: 'N/A', nip: 'N/A', jabatan: 'N/A', bidang: 'N/A' };

            const pengajuInfo = detail.pengaju_info && detail.pengaju_info.nama !== 'N/A' ? detail.pengaju_info : {
                ...defaultUserInfoPDF,
                nama: 'Pengaju',
                jabatan: 'Staff',
                // pangkat akan diambil dari defaultUserInfoPDF jika tidak ada
            };

            const kepalaBidangInfo = detail.kepala_bidang_info && detail.kepala_bidang_info.nama !== 'N/A' ? detail.kepala_bidang_info : {
                ...defaultUserInfoPDF,
                nama: 'Kepala Bidang Ybs.',
                jabatan: 'Kepala Bidang',
                bidang: pengajuInfo.bidang,
                // pangkat akan diambil dari defaultUserInfoPDF jika tidak ada
            };

            const sekretarisInfo = detail.sekretaris_info && detail.sekretaris_info.nama !== 'N/A' ? detail.sekretaris_info : {
                ...defaultUserInfoPDF,
                nama: 'Sekretaris Ybs.',
                jabatan: 'Sekretaris',
                bidang: 'Unit Kearsipan'
            };

            const blob = await pdf(
                <BeritaAcaraPDF
                    beritaAcara={ba}
                    pemindahanInfo={pi}
                    selectedArsip={detail.combined_arsip_details}
                    userInfo={pengajuInfo}
                    kepalaBidangInfo={kepalaBidangInfo}
                    sekretarisInfo={sekretarisInfo}
                />
            ).toBlob();

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = pdfFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("PDF berhasil diunduh");
        } catch (error) {
            console.error("[LOG HANDLE DOWNLOAD] Terjadi kesalahan saat membuat PDF:", error);
            toast.error("Terjadi kesalahan saat membuat PDF");
        }
    };

    const canDownloadPdf = isClient && detail && ba && pi && detail.combined_arsip_details;

    return (
        <div className="w-full h-full p-6">
            {/* Tombol Kembali dipindahkan ke sini */}
            <Link href="/arsip/pemindahan/riwayat" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 mb-4 transition-colors">
                <ArrowLeft size={18} /> Kembali ke Riwayat
            </Link>
            <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                    {/* Header */}
                    <div className="bg-primary/10 px-6 py-4 flex flex-wrap justify-between items-center gap-4 rounded-lg">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-primary">
                                Detail Proses Pemindahan Arsip
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                No. Berita Acara: <span className="font-semibold text-foreground">{ba?.nomor_berita_acara || "N/A"}</span>
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <span className={`px-3 py-1.5 text-xs font-semibold rounded-full flex items-center gap-1.5 ${detail.is_completed ? "bg-green-500/10 text-green-500 dark:text-green-400" : "bg-yellow-500/10 text-yellow-500 dark:text-yellow-400"
                                }`}>
                                {detail.is_completed ? <CheckCircle size={14} /> : <Clock size={14} />}
                                {detail.is_completed ? "Selesai" : "Tertunda"}
                            </span>
                            {canDownloadPdf ? (
                                <button
                                    onClick={handleDownloadPdf}
                                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    <Download size={16} /> Unduh PDF
                                </button>
                            ) : (
                                <button
                                    disabled
                                    title="Data belum lengkap untuk membuat PDF atau komponen belum siap"
                                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground bg-muted rounded-lg cursor-not-allowed"
                                >
                                    <Download size={16} /> Unduh PDF
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-6 flex-grow overflow-y-auto">
                        {/* Informasi Umum */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-foreground mb-3 border-b border-border/50 pb-2">Informasi Umum</h2>
                                <div className="text-sm space-y-2">
                                    <p className="flex items-center"><User size={16} className="mr-2 text-muted-foreground" /> <span className="font-medium text-muted-foreground w-32">Pengaju:</span> <span className="text-foreground">{detail.user?.nama || "N/A"}</span></p>
                                    <p className="flex items-center"><Calendar size={16} className="mr-2 text-muted-foreground" /> <span className="font-medium text-muted-foreground w-32">Tgl. Pengajuan:</span> <span className="text-foreground">{formatDate(detail.created_at, true)}</span></p>
                                    <p className="flex items-center"><Info size={16} className="mr-2 text-muted-foreground" /> <span className="font-medium text-muted-foreground w-32">Status Proses:</span> <span className="text-foreground">{ps?.status || "N/A"}</span></p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-foreground mb-3 border-b border-border/50 pb-2">Status Persetujuan</h2>
                                <div className="text-sm space-y-2">
                                    <p className="flex items-center">
                                        <User size={16} className="mr-2 text-muted-foreground" /> <span className="font-medium text-muted-foreground w-32">Kepala Bidang:</span>
                                        <span className={`ml-1 px-2.5 py-1 text-xs rounded-full ${as?.kepala_bidang?.status === "Disetujui" ? "bg-green-500/10 text-green-500 dark:text-green-400" :
                                            as?.kepala_bidang?.status === "Ditolak" ? "bg-red-500/10 text-red-500 dark:text-red-400" :
                                                "bg-muted/50 text-muted-foreground"
                                            }`}>
                                            {as?.kepala_bidang?.status || "Menunggu"}
                                        </span>
                                    </p>
                                    <p className="flex items-center">
                                        <User size={16} className="mr-2 text-muted-foreground" /> <span className="font-medium text-muted-foreground w-32">Sekretaris:</span>
                                        <span className={`ml-1 px-2.5 py-1 text-xs rounded-full ${as?.sekretaris?.status === "Disetujui" ? "bg-green-500/10 text-green-500 dark:text-green-400" :
                                            as?.sekretaris?.status === "Ditolak" ? "bg-red-500/10 text-red-500 dark:text-red-400" :
                                                "bg-muted/50 text-muted-foreground"
                                            }`}>
                                            {as?.sekretaris?.status || "Menunggu"}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Detail Berita Acara */}
                        {ba && (
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold text-foreground mb-3 border-b border-border/50 pb-2">Detail Berita Acara</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                    <p className="flex items-start"><FileText size={16} className="inline mr-2 mt-0.5 text-muted-foreground flex-shrink-0" /> <span className="font-medium text-muted-foreground w-28">Nomor:</span> <span className="text-foreground">{ba.nomor_berita_acara}</span></p>
                                    <p className="flex items-start"><Calendar size={16} className="inline mr-2 mt-0.5 text-muted-foreground flex-shrink-0" /> <span className="font-medium text-muted-foreground w-28">Tanggal:</span> <span className="text-foreground">{formatDate(ba.tanggal_berita_acara)}</span></p>
                                    <p className="col-span-1 md:col-span-2 flex items-start"><Info size={16} className="inline mr-2 mt-0.5 text-muted-foreground flex-shrink-0" /> <span className="font-medium text-muted-foreground w-28">Dasar:</span> <span className="text-foreground whitespace-pre-wrap">{ba.dasar}</span></p>
                                    <p className="col-span-1 md:col-span-2 flex items-start"><Info size={16} className="inline mr-2 mt-0.5 text-muted-foreground flex-shrink-0" /> <span className="font-medium text-muted-foreground w-28">Keterangan:</span> <span className="text-foreground whitespace-pre-wrap">{ba.keterangan || "-"}</span></p>
                                </div>
                            </div>
                        )}

                        {/* Detail Informasi Pemindahan */}
                        {pi && (
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold text-foreground mb-3 border-b border-border/50 pb-2">Informasi Penyimpanan Inaktif</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                    <p className="flex items-start"><Building size={16} className="inline mr-2 mt-0.5 text-muted-foreground flex-shrink-0" /> <span className="font-medium text-muted-foreground w-28">Lokasi Simpan:</span> <span className="text-foreground">{pi.lokasi_simpan}</span></p>
                                    <p className="flex items-start"><Box size={16} className="inline mr-2 mt-0.5 text-muted-foreground flex-shrink-0" /> <span className="font-medium text-muted-foreground w-28">Nomor Boks:</span> <span className="text-foreground">{pi.nomor_boks}</span></p>
                                    <p className="col-span-1 md:col-span-2 flex items-start"><Info size={16} className="inline mr-2 mt-0.5 text-muted-foreground flex-shrink-0" /> <span className="font-medium text-muted-foreground w-28">Kategori Arsip:</span> <span className="text-foreground">{pi.kategori_arsip}</span></p>
                                </div>
                            </div>
                        )}

                        {/* Daftar Arsip yang Dipindahkan */}
                        {sortedArsipDetails.length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold text-foreground mb-4 border-b border-border/50 pb-2">Daftar Arsip ({sortedArsipDetails.length} item)</h2>
                                <div className="overflow-x-auto rounded-lg border border-border"> 
                                    <table className="min-w-full divide-y divide-border table-fixed">
                                        <thead className="bg-muted">
                                            <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                <th className="px-3 py-3 w-20">No. Berkas</th>
                                                <th className="px-3 py-3 w-36">Kode Klasifikasi</th>
                                                <th className="px-3 py-3 w-32">Jenis Arsip</th>
                                                <th className="px-3 py-3 w-28 text-center">Nasib Akhir</th>
                                                <th className="px-3 py-3 min-w-[180px]">Uraian Informasi</th> 
                                                <th className="px-3 py-3 w-20 text-center">Jumlah</th>
                                                <th className="px-3 py-3 w-44">Kurun Waktu Penciptaan</th> 
                                                <th className="px-3 py-3 w-52">Jangka Simpan (Aktif/Inaktif)</th> 
                                            </tr>
                                        </thead>
                                        <tbody className="bg-card divide-y divide-border">
                                            {sortedArsipDetails.map((arsip, index) => (
                                                <tr key={arsip.id_arsip_aktif || index} className="hover:bg-muted/50 text-sm text-foreground">
                                                    <td className="px-3 py-3 text-sm text-foreground whitespace-nowrap">{arsip.nomor_berkas}</td>
                                                    <td className="px-3 py-3 text-sm text-foreground break-words" title={arsip.kode_klasifikasi}>{arsip.kode_klasifikasi}</td>
                                                    <td className="px-3 py-3 text-sm text-foreground break-words" title={arsip.jenis_arsip}>{arsip.jenis_arsip}</td>
                                                    <td className="px-3 py-3 text-sm text-foreground text-center whitespace-nowrap">
                                                        {arsip.nasib_akhir}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-foreground break-words" title={arsip.uraian_informasi}>
                                                        {arsip.uraian_informasi}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-foreground text-center whitespace-nowrap">{arsip.jumlah}</td>
                                                    <td className="px-3 py-3 text-sm text-foreground whitespace-nowrap">
                                                        {arsip.kurun_waktu_penciptaan}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-foreground whitespace-nowrap">
                                                        <div>Aktif: ({arsip.jangka_simpan_aktif_periode || '-'})</div>
                                                        <div>Inaktif: ({arsip.jangka_simpan_inaktif_periode || '-'})</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}