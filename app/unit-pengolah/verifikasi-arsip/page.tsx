"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { sendUserNotification } from "@/utils/notificationService";
import { useAuth } from "@/context/AuthContext";
import { LoadingSkeleton } from "./components/VerifikasiArsipSkeleton";
import { ChevronLeft, ChevronRight, Search, CheckCircle2, XCircle, FileCheck, Box, Filter, Eye } from "lucide-react"; // Tambah Eye
import Loading from "../loading";

interface Arsip {
    id_arsip_aktif: string;
    nomor_berkas: number;
    kode_klasifikasi: string;
    uraian_informasi: string;
    jumlah: number;
    keterangan: string;
    file_url: string | null;
    user_id: string | null;
    created_at: string | null;
    tingkat_perkembangan: string | null;
    media_simpan: string | null;
    jangka_simpan: string | null;
    tanggal_mulai: string | null;
    tanggal_berakhir: string | null;
    masa_retensi: number | null;
    kurun_waktu: string | null;
    status_persetujuan: string;
    lokasi_penyimpanan: {
        no_filing_cabinet: string | null;
        no_laci: string | null;
        no_folder: string | null;
    } | null;
}

export default function VerifikasiArsip() {
    const supabase = createClient();
    const [arsipList, setArsipList] = useState<Arsip[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedArsipIds, setSelectedArsipIds] = useState<string[]>([]);
    const { user, isLoading: isAuthLoading, error: authError } = useAuth();
    const [dataLoading, setDataLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [statusFilter, setStatusFilter] = useState("Menunggu");

    const router = useRouter();

    const ITEMS_PER_PAGE = 10;
    const ALLOWED_ROLE = "Kepala_Bidang";

    const fetchData = useCallback(async (idBidangKepala: number, page: number) => {
        if (!idBidangKepala) {
            setDataLoading(false);
            return;
        }
        setDataLoading(true);

        const { data: lokasiDiBidang, error: lokasiError } = await supabase
            .from("lokasi_penyimpanan")
            .select("id_lokasi")
            .eq("id_bidang_fkey", idBidangKepala);

        if (lokasiError) {
            const message = lokasiError.message || "Gagal memuat data lokasi untuk bidang.";
            toast.error(message);
            setDataLoading(false);
            setArsipList([]);
            setTotalPages(0);
            return;
        }

        const lokasiIdsDiBidang = lokasiDiBidang?.map(l => l.id_lokasi) || [];

        if (lokasiIdsDiBidang.length === 0) {
            setArsipList([]);
            setTotalPages(0);
            setDataLoading(false);
            return;
        }

        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE - 1;

        const { data: pemindahanLinks, error: pemindahanError } = await supabase
            .from('pemindahan_arsip_link')
            .select('id_arsip_aktif_fkey');

        if (pemindahanError) {
            toast.error("Gagal memuat data link pemindahan: " + pemindahanError.message);
        }

        const idsToExclude = pemindahanLinks?.map(link => link.id_arsip_aktif_fkey).filter(id => id != null) || [];

        let query = supabase
            .from("arsip_aktif")
            .select(`
                *, 
                id_arsip_aktif,
                lokasi_penyimpanan:id_lokasi_fkey (
                    no_filing_cabinet,
                    no_laci,
                    no_folder
                )
            `, { count: "exact" })
            .in("id_lokasi_fkey", lokasiIdsDiBidang);

        if (statusFilter !== "all") {
            query = query.eq("status_persetujuan", statusFilter);
        }

        if (idsToExclude.length > 0) {
            const idsToExcludeString = `(${idsToExclude.join(',')})`;
            query = query.not('id_arsip_aktif', 'in', idsToExcludeString);
        }

        query = query.order("nomor_berkas", { ascending: true })
            .range(startIndex, endIndex);

        const { data, error, count } = await query;

        if (error) {
            const message = error.message || "Gagal memuat data arsip!";
            toast.error(message);
            setArsipList([]);
            setTotalPages(0);
        } else {
            setArsipList(data || []);
            setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
        }
        setDataLoading(false);
    }, [supabase, ITEMS_PER_PAGE, statusFilter]);

    useEffect(() => {
        // Jika AuthContext masih loading, tunggu
        if (isAuthLoading) return;

        // Jika ada error dari AuthContext, tampilkan dan jangan lanjutkan
        if (authError) {
            toast.error(`Error Autentikasi: ${authError}`);
            // router.push("/sign-in"); // AuthContext mungkin sudah redirect
            return;
        }

        // Jika tidak ada user setelah AuthContext selesai loading, redirect (AuthContext seharusnya sudah melakukan ini)
        if (!user) {
            // router.push("/sign-in"); // AuthContext handles this
            return;
        }

        // Verifikasi role pengguna
        if (user.role !== ALLOWED_ROLE) {
            toast.warn("Anda tidak memiliki izin untuk mengakses halaman ini.");
            // router.push(DEFAULT_HOME_PATH); // AuthContext/HomeRedirect handles this
            return;
        }

        // Pastikan data bidang pengguna tersedia
        if (!user.id_bidang_fkey) {
            toast.warn("Data bidang pengguna tidak lengkap. Silakan login kembali atau hubungi admin.");
            // router.push("/sign-in"); // AuthContext mungkin sudah redirect
            return;
        }

        // Jika semua pengecekan lolos, panggil fetchData
        fetchData(user.id_bidang_fkey, currentPage);

    }, [user, isAuthLoading, authError, router, ALLOWED_ROLE, fetchData, currentPage]);

    const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    }, []);

    const filteredArsip = useMemo(() => {
        return arsipList.filter(arsip =>
            searchTerm === "" ||
            (arsip.kode_klasifikasi?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (arsip.uraian_informasi?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [arsipList, searchTerm]);

    const updateStatus = async (status: string, arsipIds?: string[]) => {
        const idsToProcess = arsipIds ?? selectedArsipIds;
        if (idsToProcess.length === 0) {
            toast.warn("Pilih arsip terlebih dahulu!");
            return;
        }

        if (!user || !user.id_bidang_fkey) {
            toast.error("Sesi pengguna tidak valid atau ID bidang tidak ditemukan.");
            return;
        }

        setDataLoading(true);
        const { data: arsipToUpdate, error: fetchError } = await supabase
            .from("arsip_aktif")
            .select("id_arsip_aktif, uraian_informasi, kode_klasifikasi, user_id")
            .in("id_arsip_aktif", idsToProcess);

        if (fetchError || !arsipToUpdate || arsipToUpdate.length === 0) {
            toast.error("Gagal memuat data arsip untuk diupdate!");
            setDataLoading(false);
            return;
        }
        const { error: updateError } = await supabase
            .from("arsip_aktif")
            .update({ status_persetujuan: status })
            .in("id_arsip_aktif", idsToProcess);

        if (updateError) {
            toast.error("Gagal memperbarui status arsip!");
            setDataLoading(false);
        } else {
            toast.success(`Berhasil ${status.toLowerCase()} ${idsToProcess.length} arsip!`);

            const currentAuthUserId = user?.id;

            for (const arsip of arsipToUpdate) {
                if (arsip.user_id && arsip.user_id !== currentAuthUserId) {
                    const notificationTitle = `Status Arsip Aktif: ${status}`;
                    const notificationMessage = `Arsip "${arsip.uraian_informasi}" (${arsip.kode_klasifikasi}) telah ${status.toLowerCase()} oleh Kepala Bidang.`;
                    const link = `/arsip/detail/${arsip.id_arsip_aktif}`;

                    await sendUserNotification(
                        arsip.user_id,
                        notificationTitle,
                        notificationMessage,
                        link,
                        "arsip aktif diverifikasi"
                    );
                }
            }

            if (user.id_bidang_fkey) {
                fetchData(user.id_bidang_fkey, currentPage);
            }
            setSelectedArsipIds([]);
        }
    };

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

    if (isAuthLoading) { // Gunakan isAuthLoading dari useAuth
        return <Loading />;
    }

    // Tampilkan error dari AuthContext
    if (authError) {
        return (
            <div className="w-full h-full p-6 flex items-center justify-center">
                <div className="text-center text-red-500">
                    <h2 className="text-xl font-semibold mb-2">Error Autentikasi</h2>
                    <p>{authError}</p>
                </div>
            </div>
        );
    }

    // Jika user tidak ada setelah loading auth selesai (seharusnya sudah di-redirect oleh AuthContext)
    // atau jika role tidak sesuai (juga seharusnya sudah di-redirect)
    if (!user || user.role !== ALLOWED_ROLE) {
        // AuthContext seharusnya sudah menangani redirect,
        // tapi ini sebagai fallback atau jika ada kondisi race.
        // Bisa juga menampilkan pesan "Unauthorized" daripada loading.
        return <Loading />;
    }

    return (
        <div className="w-full h-full p-6">
            <div className="max-w-8xl mx-auto w-full h-full flex flex-col">
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                    <div className="bg-primary/10 px-6 py-4 flex justify-between items-center rounded-lg">
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-primary">
                            <FileCheck size={24} /> Verifikasi Arsip Aktif
                        </h2>
                        {selectedArsipIds.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    className="px-4 py-2 bg-[hsl(var(--neon-green))] hover:bg-[hsl(var(--neon-green))]/90 text-black dark:text-background rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-md hover:shadow-lg hover:shadow-[hsl(var(--neon-green))]/30"
                                    onClick={() => updateStatus("Disetujui")}
                                    disabled={dataLoading || selectedArsipIds.length === 0}
                                >
                                    <CheckCircle2 size={18} />
                                    Setujui ({selectedArsipIds.length})
                                </button>
                                <button
                                    className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-md hover:shadow-lg hover:shadow-destructive/30"
                                    onClick={() => updateStatus("Ditolak")}
                                    disabled={dataLoading || selectedArsipIds.length === 0}
                                >
                                    <XCircle size={18} />
                                    Tolak ({selectedArsipIds.length})
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-4 border-y border-border/50">
                        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="relative flex-1 min-w-[250px] md:w-auto">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Cari arsip berdasarkan kode klasifikasi atau uraian..."
                                        value={searchTerm}
                                        onChange={handleSearch}
                                        className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-colors duration-300"
                                    />
                                </div>
                                <div className="relative min-w-[180px]">
                                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => {
                                            setStatusFilter(e.target.value);
                                            setCurrentPage(1); // Reset ke halaman pertama saat filter berubah
                                        }}
                                        className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm transition-colors duration-300"
                                    >
                                        <option value="all">Semua Status</option>
                                        <option value="Menunggu">Menunggu</option>
                                        <option value="Disetujui">Disetujui</option>
                                        <option value="Ditolak">Ditolak</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 flex-grow flex flex-col overflow-auto">
                        {dataLoading ? (
                            <LoadingSkeleton />
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-border">
                                {filteredArsip.length > 0 ? (
                                    <table className="min-w-full divide-y divide-border">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="px-4 py-3 text-center w-12">
                                                    <input
                                                        type="checkbox"
                                                        disabled={filteredArsip.length === 0}
                                                        checked={filteredArsip.length > 0 && selectedArsipIds.length === filteredArsip.length}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            if (checked) {
                                                                setSelectedArsipIds(filteredArsip.map(a => a.id_arsip_aktif));
                                                            } else {
                                                                setSelectedArsipIds([]);
                                                            }
                                                        }}
                                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">No. Berkas</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kode</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uraian</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kurun Waktu</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jangka Simpan</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jumlah</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tingkat Perk.</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lokasi</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-card divide-y divide-border">
                                            {filteredArsip.map((arsip) => (
                                                <tr key={arsip.id_arsip_aktif} className="hover:bg-muted/30 transition-colors duration-150">
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedArsipIds.includes(arsip.id_arsip_aktif)}
                                                            onChange={(e) => {
                                                                const currentId = arsip.id_arsip_aktif;
                                                                if (e.target.checked) {
                                                                    setSelectedArsipIds(prev => [...prev, currentId]);
                                                                } else {
                                                                    setSelectedArsipIds(prev => prev.filter(id => id !== currentId));
                                                                }
                                                            }}
                                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-center text-foreground">{arsip.nomor_berkas}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-center text-foreground">{arsip.kode_klasifikasi}</td>
                                                    <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate" title={arsip.uraian_informasi}>{arsip.uraian_informasi}</td>
                                                    <td className="px-4 py-3 text-sm text-center text-foreground">{arsip.kurun_waktu || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-center text-foreground">{arsip.jangka_simpan || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-center text-foreground">{arsip.jumlah || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-center text-foreground">{arsip.tingkat_perkembangan || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-center whitespace-nowrap text-foreground">
                                                        {`${arsip.lokasi_penyimpanan?.no_filing_cabinet || '-'}/` +
                                                            `${arsip.lokasi_penyimpanan?.no_laci || '-'}/` +
                                                            `${arsip.lokasi_penyimpanan?.no_folder || '-'}`}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold leading-none ${arsip.status_persetujuan === "Disetujui"
                                                            ? "bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-400"
                                                            : arsip.status_persetujuan === "Ditolak"
                                                                ? "bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-400"
                                                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/20 dark:text-yellow-400"
                                                            }`}>
                                                            {arsip.status_persetujuan}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary group transition-all duration-150 ease-in-out"
                                                            title="Lihat Detail Arsip"
                                                            aria-label="Lihat Detail Arsip"
                                                            onClick={() => router.push(`/arsip/detail/${arsip.id_arsip_aktif}`)}
                                                        >
                                                            <Eye size={18} className="transform group-hover:scale-110 transition-transform duration-150" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-center py-16 text-muted-foreground">
                                        <Box className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
                                        <p className="text-xl font-semibold">Tidak Ada Arsip</p>
                                        <p className="text-sm">Tidak ada arsip yang cocok dengan filter atau pencarian Anda.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mt-auto p-6 pt-4">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 1 || dataLoading}
                                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg transition-colors flex items-center gap-2 hover:bg-muted/80 disabled:opacity-50"
                                >
                                    <ChevronLeft size={16} /> Sebelumnya
                                </button>
                                <span className="text-sm text-muted-foreground">
                                    Halaman {currentPage} dari {totalPages}
                                </span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages || dataLoading}
                                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg transition-colors flex items-center gap-2 hover:bg-muted/80 disabled:opacity-50"
                                >
                                    Selanjutnya <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}