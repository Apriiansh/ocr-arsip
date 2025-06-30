"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { FileText, ArrowLeft, Edit, Download, Trash2, Wand2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Setup PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

// Interface untuk data detail item
interface IsiArsipDetail {
    id_isi_arsip: string;
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
    created_at: string;
    berkas_arsip_aktif: {
        id_arsip_aktif: string;
        nomor_berkas: number;
        uraian_informasi: string;
    } | null;
    users: {
        nama: string;
    } | null;
}

// Skeleton component for loading state
const DetailLoadingSkeleton = () => {
    return (
        <div className="w-full h-screen p-6">
            <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col animate-pulse">
                    {/* Header Skeleton */}
                    <div className="bg-primary/10 px-6 py-4 flex justify-between items-center rounded-lg">
                        <div className="h-8 w-1/3 bg-primary/20 rounded"></div>
                        <div className="flex gap-2">
                            <div className="h-9 w-20 bg-primary/20 rounded"></div>
                            <div className="h-9 w-20 bg-primary/20 rounded"></div>
                        </div>
                    </div>

                    <div className="p-6 flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                        {/* Left Column Skeleton */}
                        <div className="space-y-6">
                            <div className="h-7 w-1/3 bg-muted/50 rounded mb-5"></div>
                            <div className="space-y-5">
                                {[...Array(10)].map((_, i) => (
                                    <div className="grid grid-cols-3 gap-3 items-start" key={`info-${i}`}>
                                        <div className="h-5 bg-muted/50 rounded col-span-1"></div>
                                        <div className="h-5 bg-muted/50 rounded col-span-2"></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Column Skeleton */}
                        <div>
                            <div className="h-7 w-1/2 bg-muted/50 rounded mb-4"></div>
                            <div className="border border-border/40 rounded-lg overflow-hidden h-full">
                                <div className="h-12 bg-muted/50 p-3 border-b border-border/40"></div>
                                <div className="w-full flex-1 bg-muted/40"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function IsiArsipDetailPage() {
    const supabase = createClient();
    const router = useRouter();
    const params = useParams();
    const itemId = params.id as string;

    const [itemData, setItemData] = useState<IsiArsipDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { user } = useAuth();

    const fetchItemDetail = useCallback(async () => {
        if (!itemId) {
            setError("ID Item tidak ditemukan di URL.");
            setLoading(false);
            toast.error("ID Item tidak valid.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { data, error: itemError } = await supabase
                .from('daftar_isi_arsip_aktif')
                .select(`
                    *,
                    berkas_arsip_aktif:id_berkas_induk_fkey (id_arsip_aktif, nomor_berkas, uraian_informasi),
                    users:user_id (nama)
                `)
                .eq('id_isi_arsip', itemId)
                .single();

            if (itemError) {
                if (itemError.code === 'PGRST116') {
                    setError(`Item arsip dengan ID "${itemId}" tidak ditemukan.`);
                    toast.error(`Item arsip tidak ditemukan.`);
                } else {
                    throw itemError;
                }
                return;
            }

            if (data) {
                setItemData(data as unknown as IsiArsipDetail);
            } else {
                setError(`Item arsip dengan ID "${itemId}" tidak ditemukan.`);
                toast.error(`Item arsip tidak ditemukan.`);
            }
        } catch (err: any) {
            console.error("Error fetching item details:", err);
            setError("Gagal memuat detail item arsip. " + err.message);
            toast.error("Gagal memuat detail item arsip.");
        } finally {
            setLoading(false);
        }
    }, [itemId, supabase]);

    useEffect(() => {
        fetchItemDetail();
    }, [fetchItemDetail]);

    const handleDelete = async () => {
        if (!itemData) return;
        if (!window.confirm(`Apakah Anda yakin ingin menghapus item "${itemData.uraian_informasi}"?`)) return;

        setLoading(true);
        const { error: deleteError } = await supabase
            .from('daftar_isi_arsip_aktif')
            .delete()
            .eq('id_isi_arsip', itemData.id_isi_arsip);

        if (deleteError) {
            toast.error(`Gagal menghapus item: ${deleteError.message}`);
            setLoading(false);
        } else {
            toast.success("Item berhasil dihapus.");
            if (itemData.berkas_arsip_aktif?.id_arsip_aktif) {
                router.push(`/arsip/detail/${itemData.berkas_arsip_aktif.id_arsip_aktif}`);
            } else {
                router.push('/arsip/daftar-aktif');
            }
        }
    };

    const formatDate = (dateString: string | null | undefined, includeTime: boolean = false) => {
        if (!dateString) return 'N/A';
        try {
            const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
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
            <div className="w-full h-screen p-6 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-destructive">{error}</p>
                    <button onClick={() => router.back()} className="mt-4 btn-primary">Kembali</button>
                </div>
            </div>
        );
    }

    if (!itemData) {
        return (
            <div className="w-full h-screen p-6 flex items-center justify-center">
                <p className="text-xl text-muted-foreground">Detail item tidak dapat dimuat.</p>
            </div>
        );
    }

    const showEdit = user?.role === 'Pegawai';

    return (
        <div className="w-full h-screen p-6">
            <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                    {/* Header */}
                    <div className="bg-primary/10 px-6 py-4 flex flex-wrap justify-between items-center gap-4 rounded-lg flex-shrink-0">
                        <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
                            <FileText size={30} />
                            Detail Item Arsip
                        </h1>
                        <div className="flex gap-3">
                            <button onClick={() => router.back()} className="btn-secondary flex items-center gap-2">
                                <ArrowLeft size={18} />
                            </button>
                            {showEdit && (
                                <Link href={`/arsip/arsip-aktif?editId=${itemId}&formMode=arsip`} className="btn-primary flex items-center gap-2">
                                    <Edit size={18} />
                                </Link>
                            )}
                            {/* Alih Media Button: Langsung ke Halaman Alih Media, auto OCR */}
                            {showEdit && itemData.file_url && (
                                <Link
                                    href={`/arsip/alih-media?isiArsipId=${itemId}&fileUrl=${encodeURIComponent(itemData.file_url)}`}
                                    className="btn-accent flex items-center gap-2"
                                    title="Alih Media dari File Digital (OCR Surat Scan)"
                                >
                                    <Wand2 size={18} />
                                    Alih Media
                                </Link>
                            )}
                            <button onClick={handleDelete} className="btn-destructive flex items-center gap-2">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="p-6 flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                        {/* Left Column: Details */}
                        <div className="flex flex-col min-h-0">
                            <div className="bg-muted/30 rounded-lg border border-border/40 flex-grow flex flex-col min-h-0">
                                <div className="p-5 border-b border-border/40 flex-shrink-0">
                                    <h3 className="text-lg font-semibold text-foreground">Informasi Item</h3>
                                </div>
                                <div className="p-5 flex-grow overflow-y-auto">
                                    <dl className="space-y-4 text-xl">
                                        {[
                                            {
                                                label: "Berkas Induk",
                                                value: itemData.berkas_arsip_aktif ?
                                                    `${itemData.berkas_arsip_aktif.nomor_berkas} - ${itemData.berkas_arsip_aktif.uraian_informasi}` :
                                                    'N/A'
                                            },
                                            { label: "No. Item", value: itemData.nomor_item },
                                            { label: "Kode Klasifikasi", value: itemData.kode_klasifikasi },
                                            { label: "Uraian Informasi", value: itemData.uraian_informasi, preWrap: true },
                                            { label: "Kurun Waktu", value: itemData.kurun_waktu },
                                            { label: "Jumlah", value: `${itemData.jumlah || 0} Lembar` },
                                            { label: "Tingkat Perkembangan", value: itemData.tingkat_perkembangan },
                                            { label: "Media Simpan", value: itemData.media_simpan },
                                            { label: "Jangka Simpan", value: itemData.jangka_simpan },
                                            { label: "Keterangan", value: itemData.keterangan, preWrap: true },
                                            { label: "Dibuat Oleh", value: itemData.users?.nama },
                                            { label: "Tanggal Dibuat", value: formatDate(itemData.created_at, true) },
                                        ].map(item => (
                                            <div className="grid grid-cols-3 gap-3 items-start" key={item.label}>
                                                <dt className="font-medium text-muted-foreground col-span-1">{item.label}:</dt>
                                                <dd className={`text-foreground col-span-2 ${item.preWrap ? 'whitespace-pre-wrap' : ''}`}>
                                                    {displayValue(item.value)}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: PDF Viewer */}
                        <div className="flex flex-col min-h-0">
                            <div className="border border-border rounded-lg overflow-hidden shadow-lg flex-grow flex flex-col min-h-0">
                                {/* PDF Header */}
                                <div className="bg-muted/50 p-3 flex justify-between items-center border-b border-border/40 flex-shrink-0">
                                    <span className="text-sm font-medium text-muted-foreground truncate">
                                        {itemData.file_url ? 'Dokumen Digital' : 'Tidak Ada Dokumen'}
                                    </span>
                                    {itemData.file_url && (
                                        <a
                                            href={itemData.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-icon hover:bg-primary/20 transition-colors duration-200"
                                            title="Unduh Dokumen"
                                        >
                                            <Download size={18} />
                                        </a>
                                    )}
                                </div>

                                {/* PDF Content */}
                                <div className="flex-grow bg-muted/20 flex items-center justify-center min-h-0">
                                    {itemData.file_url ? (
                                        <iframe
                                            src={itemData.file_url}
                                            className="w-full h-full border-0"
                                            title="PDF Preview"
                                            style={{ minHeight: '500px' }}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-muted-foreground p-8">
                                            <FileText size={64} className="mb-4 opacity-50" />
                                            <p className="text-lg font-medium">Tidak ada dokumen digital</p>
                                            <p className="text-sm text-center mt-2">
                                                Dokumen fisik belum didigitalkan atau tidak tersedia dalam format digital.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}