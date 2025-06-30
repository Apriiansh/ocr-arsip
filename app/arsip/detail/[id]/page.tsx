"use client";

import { useEffect, useState, useCallback, Fragment } from 'react';
import { Trash2, Eye, Edit, ArrowLeft, FolderOpen } from 'lucide-react'; 
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface ArsipAktifDetail {
    id_arsip_aktif: string;
    nomor_berkas: number;
    kode_klasifikasi: string;
    uraian_informasi: string;
    jumlah: number;
    keterangan: string; 
    user_id: string;
    created_at: string;
    tingkat_perkembangan: string | null;
    media_simpan: string | null;
    kurun_waktu: string | null;
    jangka_simpan: string | null; 
    akses: string | null;
    status_persetujuan: string | null;
    id_lokasi_fkey: string | null;
    users: { 
        nama: string;
    } | null; // 
    lokasi_penyimpanan: { 
        no_filing_cabinet: string;
        no_laci: string;
        no_folder: string;
        daftar_bidang: { 
            nama_bidang: string;
        } | null;
    } | null;
    isi_berkas_arsip_count?: number; 
}

// Definisi interface untuk daftar isi arsip aktif (disesuaikan untuk halaman detail ini)
interface IsiBerkasDetailRow {
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
}

const DetailLoadingSkeleton = () => {
    return (
        <div className="w-full h-full p-6">
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
                                <div className="h-7 w-1/3 bg-muted/50 rounded mb-5"></div> {/* Periode & Status */}
                                <div className="space-y-5">
                                    {[...Array(5)].map((_, i) => (
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
                                
                                <div className="h-7 w-1/2 bg-muted/50 rounded mt-10 mb-5"></div> {/* Lokasi Penyimpanan */}
                                <div className="space-y-5">
                                    {[...Array(4)].map((_, i) => (
                                        <div className="grid grid-cols-3 gap-3 items-start" key={`loc-${i}`}>
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

export default function ArsipDetailPage() {
    const supabase = createClient();
    const router = useRouter();
    const params = useParams();
    const archiveId = params.id as string;

    const [archiveData, setArchiveData] = useState<ArsipAktifDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [itemCount, setItemCount] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isiBerkasList, setIsiBerkasList] = useState<IsiBerkasDetailRow[]>([]); 
    
    const { user, isLoading } = useAuth();

    const getBackUrl = () => {
        if (user?.role === "Kepala_Bidang") return "/unit-pengolah/verifikasi-arsip";
        return "/arsip/daftar-aktif";
      };

    const fetchArchiveDetail = useCallback(async () => {
        if (!archiveId) { 
            setError("ID Arsip tidak ditemukan di URL."); 
            setLoading(false); 
            toast.error("ID Arsip tidak valid."); 
            return; 
        }

        setLoading(true);
            setError(null);
            try {
                const { data: berkasData, error: berkasError } = await supabase
                    .from('arsip_aktif')
                    .select(`
                        id_arsip_aktif,
                        nomor_berkas,
                        kode_klasifikasi,
                        uraian_informasi,
                        jumlah,
                        keterangan,
                        user_id,
                        created_at,
                        tingkat_perkembangan,
                        media_simpan,
                        kurun_waktu,
                        jangka_simpan,
                        akses,
                        status_persetujuan,
                        id_lokasi_fkey,
                        users:user_id (nama),
                        lokasi_penyimpanan:id_lokasi_fkey (
                          no_filing_cabinet,
                          no_laci,
                          no_folder,
                          daftar_bidang:id_bidang_fkey (nama_bidang)
                        )
                    `)
                    .eq('id_arsip_aktif', archiveId)
                    .single();

                if (berkasError) {
                    if (berkasError.code === 'PGRST116') {
                        setError(`Arsip dengan ID "${archiveId}" tidak ditemukan.`);
                        toast.error(`Arsip tidak ditemukan.`);
                    } else {
                        throw berkasError;
                    }
                    return; // Hentikan jika data berkas tidak ditemukan
                }

                if (berkasData) {
                    setArchiveData(berkasData as unknown as ArsipAktifDetail);

                    // Ambil jumlah item isi arsip
                    const { count, error: countError } = await supabase
                        .from('isi_berkas_arsip')
                        .select('*', { count: 'exact', head: true })
                        .eq('id_berkas_induk_fkey', archiveId);

                    if (countError) {
                        console.warn("Gagal mengambil jumlah item arsip:", countError.message);
                        setItemCount(0); // Atau null jika lebih sesuai
                    } else {
                        setItemCount(count ?? 0);
                    }

                    // NEW: Ambil daftar isi arsip aktif
                    const { data: isiData, error: isiError } = await supabase
                        .from('isi_berkas_arsip')
                        .select(`
                            id_isi_arsip,
                            nomor_item,
                            kode_klasifikasi,
                            uraian_informasi,
                            kurun_waktu,
                            jumlah,
                            keterangan,
                            jangka_simpan,
                            tingkat_perkembangan,
                            media_simpan,
                            file_url
                        `)
                        .eq('id_berkas_induk_fkey', archiveId)
                        .order('nomor_item', { ascending: true }); // Urutkan berdasarkan nomor item

                    if (isiError) {
                        console.error("Gagal mengambil daftar isi arsip:", isiError.message);
                        setIsiBerkasList([]); // Kosongkan daftar jika ada error
                    } else {
                        setIsiBerkasList(isiData as IsiBerkasDetailRow[]); // Set data daftar isi
                    }
                } else {
                    setError(`Arsip dengan ID "${archiveId}" tidak ditemukan.`);
                    toast.error(`Arsip tidak ditemukan.`);
                }
            } catch (err: any) {
                console.error("Error fetching archive details:", err);
                setError("Gagal memuat detail arsip. " + err.message);
                toast.error("Gagal memuat detail arsip.");
            } finally {
                setLoading(false);
            }
    }, [archiveId, supabase]); 
    
    useEffect(() => {
        fetchArchiveDetail();
    }, [fetchArchiveDetail]); 

    const handleDeleteItem = useCallback(async (id: string) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus item isi berkas ini?`)) return;
        setLoading(true); 

        const { error } = await supabase
            .from('isi_berkas_arsip')
            .delete()
            .eq('id_isi_arsip', id);

        if (error) {
            toast.error(`Gagal menghapus item isi berkas.`);
            console.error("Error deleting item:", error.message || error);
            setLoading(false);
        } else {
            toast.success("Item isi berkas berhasil dihapus!");
            fetchArchiveDetail(); 
        }
    }, [supabase, fetchArchiveDetail]); 

    // Fungsi untuk menghapus berkas induk
    const handleDeleteBerkas = useCallback(async () => {
        if (!archiveData) return;
        if (!window.confirm(`Apakah Anda yakin ingin menghapus berkas "${archiveData.uraian_informasi}"? Ini juga akan menghapus semua item isi berkas di dalamnya.`)) return;

        setLoading(true); 

        const { error } = await supabase
            .from('arsip_aktif')
            .delete()
            .eq('id_arsip_aktif', archiveData.id_arsip_aktif);

        if (error) {
            toast.error(`Gagal menghapus berkas: ${error.message}`);
            setLoading(false);
        } else {
            toast.success("Berkas berhasil dihapus!");
            router.push('/daftar-aktif');
        }
    }, [supabase, archiveData, router]);
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
                        {!isLoading && (
                            <button onClick={() => router.push(getBackUrl())} className="mt-6 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium">
                                Kembali
                            </button>
                        )}
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
                        <p className="text-xl text-muted-foreground">Detail arsip tidak dapat dimuat.</p>
                        {!isLoading && (
                            <button onClick={() => router.push(getBackUrl())} className="mt-6 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium">
                                Kembali ke Daftar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const showEdit =
        user?.role === 'Pegawai';

    return (
        <div className="w-full h-full p-6">
            <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                    {/* Header */}
                    <div className="bg-primary/10 px-6 py-4 flex flex-wrap justify-between items-center gap-4 rounded-lg">
                        <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
                            <FolderOpen size={30} /> Detail Berkas Arsip Aktif
                        </h1>
                        <div className="flex gap-3">
                            <button
                                onClick={() => router.push(getBackUrl())}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            {showEdit && (
                                <Link href={`/arsip/arsip-aktif?editId=${archiveId}`} className="btn-primary flex items-center gap-2">
                                    <Edit size={18} />
                                </Link>
                            )}
                            <button
                                onClick={handleDeleteBerkas}
                                className="btn-destructive flex items-center gap-2"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 flex-grow overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div>
                                <h3 className="text-xl font-semibold text-foreground mb-4">Informasi Dasar</h3>
                                <dl className="space-y-4 text-xl">
                                    {[
                                        { label: "No. Berkas", value: archiveData.nomor_berkas },
                                        { label: "Kode Klasifikasi", value: archiveData.kode_klasifikasi },
                                        { label: "Uraian Informasi", value: archiveData.uraian_informasi, preWrap: true },
                                        { label: "Jumlah Arsip di Berkas", value: itemCount !== null ? `${itemCount} item` : 'Memuat...' },
                                        { label: "Jumlah", value: archiveData.jumlah },
                                        { label: "Keterangan", value: archiveData.keterangan, preWrap: true },
                                        { label: "Akses", value: archiveData.akses },
                                        { label: "Tingkat Perkembangan", value: archiveData.tingkat_perkembangan },
                                        { label: "Media Simpan", value: archiveData.media_simpan },
                                    ].map(item => (
                                        <div className="grid grid-cols-3 gap-3 items-start" key={item.label}>
                                            <dt className="font-medium text-muted-foreground col-span-1">{item.label}:</dt>
                                            <dd className={`text-foreground col-span-2 ${item.preWrap ? 'whitespace-pre-wrap' : ''}`}>{displayValue(item.value)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold text-foreground mb-4">Periode & Status</h3>
                                <dl className="space-y-4 text-xl">
                                    {[
                                        // tanggal_mulai dan tanggal_berakhir dihapus
                                        { label: "Jangka Simpan (Aktif)", value: archiveData.jangka_simpan ? `${archiveData.jangka_simpan}` : 'N/A' },
                                        { label: "Kurun Waktu", value: archiveData.kurun_waktu },
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

                                <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Informasi Tambahan</h3>
                                <dl className="space-y-4 text-xl">
                                    {[
                                        { label: "Dibuat Oleh", value: archiveData.users?.nama },
                                        { label: "Tanggal Dibuat", value: formatDate(archiveData.created_at, true) },
                                    ].map(item => (
                                        <div className="grid grid-cols-3 gap-3 items-start" key={item.label}>
                                            <dt className="font-medium text-muted-foreground col-span-1">{item.label}:</dt>
                                            <dd className="text-foreground col-span-2">{displayValue(item.value)}</dd>
                                        </div>
                                    ))}
                                </dl>

                                {archiveData.lokasi_penyimpanan && (
                                    <>
                                        <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Lokasi Penyimpanan</h3>
                                        <dl className="space-y-4 text-xl">
                                            {[
                                                { label: "Bidang", value: archiveData.lokasi_penyimpanan.daftar_bidang?.nama_bidang?.replace(/_/g, " ") },
                                                { label: "No. Filing Cabinet", value: archiveData.lokasi_penyimpanan.no_filing_cabinet },
                                                { label: "No. Laci", value: archiveData.lokasi_penyimpanan.no_laci },
                                                { label: "No. Folder", value: archiveData.lokasi_penyimpanan.no_folder },
                                            ].map(item => (
                                                <div className="grid grid-cols-3 gap-3 items-start" key={item.label}>
                                                    <dt className="font-medium text-muted-foreground col-span-1">{item.label}:</dt>
                                                    <dd className="text-foreground col-span-2">{displayValue(item.value)}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* NEW: Daftar Isi Berkas Section */}
                    {isiBerkasList.length > 0 && (
                        <div className="mt-8"> {/* Tambahkan margin-top untuk memisahkan dari bagian sebelumnya */}
                            <h3 className="text-lg font-semibold text-foreground mb-4">Daftar Isi Berkas</h3>
                            <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="min-w-full divide-y divide-border">
                                    <thead>
                                        <tr className="bg-muted text-muted-foreground">
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">No. Item</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Kode Klasifikasi</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Uraian Informasi</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Kurun Waktu</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Jumlah</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Tingkat</th>
                                            {/* <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Media</th> */}
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Jangka Simpan</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Keterangan</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-card divide-y divide-border">
                                        {isiBerkasList.map(item => (
                                            <tr key={item.id_isi_arsip} className="hover:bg-muted transition-colors duration-150">
                                                <td className="px-4 py-3 text-sm text-center">{item.nomor_item}</td>
                                                <td className="px-4 py-3 text-sm text-center">{item.kode_klasifikasi}</td>
                                                <td className="px-4 py-3 text-sm text-justify max-w-xs truncate" title={item.uraian_informasi}>{item.uraian_informasi}</td>
                                                <td className="px-4 py-3 text-sm text-center">{item.kurun_waktu || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-center">{item.jumlah || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-center">{item.tingkat_perkembangan || '-'}</td>
                                                {/* <td className="px-4 py-3 text-sm text-center">{item.media_simpan || '-'}</td> */}
                                                <td className="px-4 py-3 text-sm text-center max-w-xs truncate" title={item.jangka_simpan || undefined}>{item.jangka_simpan || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-center max-w-xs truncate" title={item.keterangan || undefined}>{item.keterangan || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                                                    <Link href={`/arsip/detail-item/${item.id_isi_arsip}`} passHref>
                                                        <button
                                                            className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary group transition-all duration-150 ease-in-out"
                                                            title="Lihat Detail Item"
                                                            aria-label="Lihat Detail Item Isi Arsip"
                                                        >
                                                            <Eye size={18} className="transform group-hover:scale-110 transition-transform duration-150" />
                                                        </button>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteItem(item.id_isi_arsip)}
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
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}