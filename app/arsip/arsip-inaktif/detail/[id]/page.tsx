"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-toastify';
import Link from 'next/link';

interface ArsipInaktifDetail {
    id_arsip_inaktif: string;
    nomor_berkas: number;
    kode_klasifikasi: string;
    jenis_arsip: string | null;
    kurun_waktu: string | null;
    tingkat_perkembangan: string | null;
    jumlah: number | null;
    keterangan: string | null;
    nomor_definitif_folder_dan_boks: string | null;
    lokasi_simpan: string | null;
    jangka_simpan: number | null;
    nasib_akhir: string | null;
    kategori_arsip: string | null;
    id_arsip_aktif: string | null; // Link ke arsip aktif jika ada
    tanggal_mulai: string | null;
    tanggal_berakhir: string | null;
    tanggal_pindah: string | null;
    file_url: string | null;
    user_id: string | null;
    created_at: string;
    status_persetujuan: string | null;
    users: { // Untuk menampilkan nama pembuat
        nama: string;
    } | null;
    arsip_aktif: { // Untuk menampilkan info dari arsip aktif terkait
        nomor_berkas: number;
        kode_klasifikasi: string;
    } | null;
}

// Loading Skeleton Component for Detail Page (Mirip dengan Arsip Aktif)
const DetailLoadingSkeleton = () => {
    return (
        <div className="w-full h-full p-6">
            <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col animate-pulse">
                    {/* Header Skeleton */}
                    <div className="bg-primary/10 px-6 py-4 flex justify-between items-center">
                        <div className="h-8 w-1/3 bg-primary/20 rounded"></div>
                        <div className="flex gap-2">
                            <div className="h-9 w-20 bg-primary/20 rounded"></div>
                            <div className="h-9 w-20 bg-primary/20 rounded"></div>
                        </div>
                    </div>

                    <div className="p-6 flex-grow overflow-y-auto">
                        {/* File Section Skeleton */}
                        <div className="mb-8 p-5 border border-border/40 rounded-lg bg-muted/30">
                            <div className="h-7 w-1/4 bg-muted/50 rounded mb-4"></div>
                            <div className="h-10 w-48 bg-muted/50 rounded mb-3"></div>
                            <div className="h-4 w-1/2 bg-muted/50 rounded"></div>
                            {/* PDF Preview Placeholder */}
                            <div className="mt-5 border border-border/40 rounded-lg overflow-hidden">
                                <div className="h-10 bg-muted/50 p-3 border-b border-border/40"></div>
                                <div className="w-full h-[60vh] bg-muted/40"></div>
                            </div>
                        </div>

                        {/* Details Grid Skeleton */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Left Column Skeleton */}
                            <div>
                                <div className="h-7 w-1/3 bg-muted/50 rounded mb-5"></div> {/* Informasi Dasar */}
                                <div className="space-y-5">
                                    {[...Array(7)].map((_, i) => (
                                        <div className="grid grid-cols-3 gap-3 items-start" key={`info-${i}`}>
                                            <div className="h-5 bg-muted/50 rounded col-span-1"></div>
                                            <div className="h-5 bg-muted/50 rounded col-span-2"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Column Skeleton */}
                            <div>
                                <div className="h-7 w-1/3 bg-muted/50 rounded mb-5"></div> {/* Penyimpanan & Retensi */}
                                <div className="space-y-5">
                                    {[...Array(9)].map((_, i) => ( // Disesuaikan jumlah itemnya
                                        <div className="grid grid-cols-3 gap-3 items-start" key={`period-${i}`}>
                                            <div className="h-5 bg-muted/50 rounded col-span-1"></div>
                                            <div className="h-5 bg-muted/50 rounded col-span-2"></div>
                                        </div>
                                    ))}
                                </div>

                                <div className="h-7 w-1/2 bg-muted/50 rounded mt-10 mb-5"></div> {/* Informasi Tambahan */}
                                <div className="space-y-5">
                                    {[...Array(2)].map((_, i) => (
                                        <div className="grid grid-cols-3 gap-3 items-start" key={`add-${i}`}>
                                            <div className="h-5 bg-muted/50 rounded col-span-1"></div>
                                            <div className="h-5 bg-muted/50 rounded col-span-2"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function ArsipInaktifDetailPage() {
    const supabase = createClient();
    const router = useRouter();
    const params = useParams();
    const archiveId = params.id as string;

    const [archiveData, setArchiveData] = useState<ArsipInaktifDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!archiveId) {
            setError("ID Arsip Inaktif tidak ditemukan di URL.");
            setLoading(false);
            toast.error("ID Arsip Inaktif tidak valid.");
            return;
        }

        const fetchArchiveDetail = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('arsip_inaktif')
                    .select(`
                        *,
                        users:user_id (nama),
                        arsip_aktif:id_arsip_aktif (nomor_berkas, kode_klasifikasi)
                    `)
                    .eq('id_arsip_inaktif', archiveId)
                    .single();

                if (fetchError) {
                    if (fetchError.code === 'PGRST116') {
                        setError(`Arsip Inaktif dengan ID "${archiveId}" tidak ditemukan.`);
                        toast.error(`Arsip Inaktif tidak ditemukan.`);
                    } else {
                        throw fetchError;
                    }
                } else if (data) {
                    setArchiveData(data as ArsipInaktifDetail);
                } else {
                    setError(`Arsip Inaktif dengan ID "${archiveId}" tidak ditemukan.`);
                    toast.error(`Arsip Inaktif tidak ditemukan.`);
                }
            } catch (err: any) {
                console.error("Error fetching inactive archive details:", err);
                setError("Gagal memuat detail arsip inaktif. " + err.message);
                toast.error("Gagal memuat detail arsip inaktif.");
            } finally {
                setLoading(false);
            }
        };

        fetchArchiveDetail();
    }, [archiveId, supabase]);

    const formatDate = (dateString: string | null | undefined, includeTime: boolean = false) => {
        if (!dateString) return 'N/A';
        try {
            const options: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            };
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
            }
            return new Date(dateString).toLocaleDateString('id-ID', options);
        } catch (e) {
            return dateString;
        }
    };

    const displayValue = (value: string | number | null | undefined) => value ?? 'N/A';

    if (loading) {
        return <DetailLoadingSkeleton />;
    }

    if (error) {
        return (
            <div className="w-full h-full p-6">
                <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
                    <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col items-center justify-center p-6">
                        <div role="alert" className="alert alert-error bg-destructive/20 text-destructive-foreground p-4 rounded-lg max-w-md w-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>Error! {error}</span>
                        </div>
                        <button onClick={() => router.back()} className="mt-6 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium">
                            Kembali
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!archiveData) {
        return (
            <div className="w-full h-full p-6">
                <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
                    <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col items-center justify-center p-6">
                        <p className="text-xl text-muted-foreground">Detail arsip inaktif tidak dapat dimuat.</p>
                        <button onClick={() => router.back()} className="mt-6 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium">
                            Kembali ke Daftar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full p-6">
            <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                    {/* Header */}
                    <div className="bg-primary/10 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Detail Arsip Inaktif</h1>
                        <div className="flex gap-3">
                            <button
                                onClick={() => router.back()}
                                className="px-4 py-2.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 text-sm font-medium flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                </svg>
                                Kembali
                            </button>
                            {/* <Link href={`/arsip/arsip-inaktif?editId=${archiveId}`} className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 text-sm font-medium flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                                Edit
                            </Link> */}
                        </div>
                    </div>

                    <div className="p-6 flex-grow overflow-y-auto">
                        {archiveData.file_url && (
                            <div className="mb-8 p-5 border border-border/40 rounded-lg bg-muted/30 dark:bg-muted/20">
                                <h2 className="text-xl font-semibold text-foreground mb-3">File Arsip</h2>
                                <Link href={archiveData.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                    Lihat/Unduh File
                                </Link>
                                <p className="text-sm text-muted-foreground mt-2">Nama file: {archiveData.file_url.split('/').pop()?.split('?')[0]}</p>
                                <div className="mt-5 border border-border/40 rounded-lg overflow-hidden">
                                    <h3 className="text-md font-semibold text-foreground p-3 bg-muted/50 dark:bg-muted/30 border-b border-border/40">Preview Dokumen</h3>
                                    <iframe src={archiveData.file_url} className="w-full h-[70vh] bg-background" title="PDF Preview" />
                                </div>
                            </div>
                        )}
                        {!archiveData.file_url && (
                            <div className="mb-8 p-5 border border-border/40 rounded-lg bg-muted/30 dark:bg-muted/20">
                                <h2 className="text-xl font-semibold text-foreground mb-2">File Arsip</h2>
                                <p className="text-muted-foreground">Tidak ada file yang terlampir untuk arsip ini.</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-4">Informasi Dasar</h3>
                                <dl className="space-y-4 text-sm">
                            {[
                                { label: "No. Berkas", value: archiveData.nomor_berkas },
                                { label: "Kode Klasifikasi", value: archiveData.kode_klasifikasi },
                                { label: "Jenis Arsip", value: archiveData.jenis_arsip },
                                { label: "Kurun Waktu", value: archiveData.kurun_waktu },
                                { label: "Tingkat Perkembangan", value: archiveData.tingkat_perkembangan },
                                { label: "Jumlah", value: archiveData.jumlah },
                                { label: "Keterangan", value: archiveData.keterangan },
                                    ].map(item => (
                                        <div className="grid grid-cols-3 gap-3 items-start" key={item.label}>
                                            <dt className="font-medium text-muted-foreground col-span-1">{item.label}:</dt>
                                            <dd className={`text-foreground col-span-2 ${item.label === 'Jenis Arsip' || item.label === 'Keterangan' ? 'whitespace-pre-wrap' : ''}`}>{displayValue(item.value)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-4">Penyimpanan & Retensi</h3>
                                <dl className="space-y-4 text-sm">
                            {[
                                { label: "No. Definitif Folder/Boks", value: archiveData.nomor_definitif_folder_dan_boks },
                                { label: "Lokasi Simpan", value: archiveData.lokasi_simpan },
                                { label: "Jangka Simpan Inaktif", value: archiveData.jangka_simpan ? `${archiveData.jangka_simpan} Tahun` : 'N/A' },
                                { label: "Nasib Akhir", value: archiveData.nasib_akhir },
                                { label: "Kategori Arsip", value: archiveData.kategori_arsip },
                                { label: "Tgl. Mulai (Periode Arsip)", value: formatDate(archiveData.tanggal_mulai, false) },
                                { label: "Tgl. Berakhir (Periode Arsip)", value: formatDate(archiveData.tanggal_berakhir, false) },
                                { label: "Tanggal Pindah ke Inaktif", value: formatDate(archiveData.tanggal_pindah, false) },
                                { label: "Status Persetujuan", value: archiveData.status_persetujuan, isStatus: true },
                                    ].map(item => (
                                        <div className="grid grid-cols-3 gap-3 items-start" key={item.label}>
                                            <dt className="font-medium text-muted-foreground col-span-1">{item.label}:</dt>
                                            <dd className="text-foreground col-span-2">
                                        {item.isStatus ? (
                                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${item.value === 'Disetujui' ? 'bg-green-500/10 text-green-500 dark:text-green-400' :
                                                            item.value === 'Ditolak' ? 'bg-red-500/10 text-red-500 dark:text-red-400' :
                                                                item.value === 'Menunggu' ? 'bg-yellow-500/10 text-yellow-500 dark:text-yellow-400' :
                                                                    'bg-muted/50 text-muted-foreground'
                                                }`}>
                                                {displayValue(item.value)}
                                            </span>
                                        ) : displayValue(item.value)}
                                    </dd>
                                </div>
                                    ))}
                                </dl>

                                <h3 className="text-lg font-semibold text-foreground mt-8 mb-4">Informasi Tambahan</h3>
                                <dl className="space-y-4 text-sm">
                            {[
                                { label: "Dibuat Oleh", value: archiveData.users?.nama },
                                { label: "Tanggal Dibuat", value: formatDate(archiveData.created_at, true) },
                                // { label: "ID Arsip Aktif Terkait", value: archiveData.id_arsip_aktif ? `${archiveData.id_arsip_aktif} (No. Berkas: ${archiveData.arsip_aktif?.nomor_berkas || 'N/A'}, Kode: ${archiveData.arsip_aktif?.kode_klasifikasi || 'N/A'})` : 'N/A' },
                                    ].map(item => (
                                        <div className="grid grid-cols-3 gap-3 items-start" key={item.label}>
                                            <dt className="font-medium text-muted-foreground col-span-1">{item.label}:</dt>
                                            <dd className="text-foreground col-span-2">{displayValue(item.value)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}