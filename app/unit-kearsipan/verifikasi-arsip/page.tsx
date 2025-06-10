"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { FileCheck, CheckCircle2, XCircle, Search, Filter, Box } from "lucide-react";
import { toast } from "react-toastify";
import { sendUserNotification } from "@/utils/notificationService";
import { LoadingSkeleton } from "./components/VerifikasiArsipSkeleton";

interface ArsipInaktif {
    id_arsip_inaktif: string;
    nomor_berkas: string;
    kode_klasifikasi: string;
    jenis_arsip: string;
    kurun_waktu: string;
    jumlah: number;
    status_persetujuan: string;
    created_at: string;
    tingkat_perkembangan: string | null;
    keterangan: string | null;
    nomor_definitif_folder_dan_boks: string | null;
    lokasi_simpan: string | null;
    jangka_simpan: number | null;
    nasib_akhir: string | null;
    kategori_arsip: string | null;
    tanggal_pindah: string | null;
    user_id?: string;
}

export default function VerifikasiArsipInaktif() {
    const supabase = createClient();
    const router = useRouter();

    // State Management
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [arsipList, setArsipList] = useState<ArsipInaktif[]>([]);
    const [filteredArsip, setFilteredArsip] = useState<ArsipInaktif[]>([]);
    const [selectedArsipIds, setSelectedArsipIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("Menunggu");
    const [sortConfig, setSortConfig] = useState<{ key: 'nomor_berkas' | 'created_at'; direction: 'asc' | 'desc' }>({
        key: 'created_at',
        direction: 'desc'
    });

    // Constants
    const ALLOWED_ROLE = "Sekretaris";
    const SIGN_IN_PATH = "/sign-in";
    const DEFAULT_HOME_PATH = "/";

    // Authentication Check
    const checkAuth = useCallback(async () => {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error("No active session");
            }
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("role")
                .eq("user_id", session.user.id)
                .single();
            if (userError || !userData || !userData.role) {
                throw new Error("Invalid user data");
            }
            if (userData.role !== ALLOWED_ROLE) {
                throw new Error("Unauthorized role");
            }
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Authentication error";
            console.error("Auth error:", message);
            router.push(message === "Unauthorized role" ? DEFAULT_HOME_PATH : SIGN_IN_PATH);
            return false;
        }
    }, [router, supabase]);

    // Fetch Data
    const fetchArsipInaktif = useCallback(async () => {
        try {
            setDataLoading(true);
            let query = supabase
                .from("arsip_inaktif")
                .select(`
                    id_arsip_inaktif,
                    nomor_berkas,
                    kode_klasifikasi,
                    jenis_arsip,
                    kurun_waktu,
                    jumlah,
                    status_persetujuan,
                    created_at,
                    tingkat_perkembangan,
                    keterangan,
                    nomor_definitif_folder_dan_boks,
                    lokasi_simpan,
                    jangka_simpan,
                    nasib_akhir,
                    kategori_arsip,
                    tanggal_pindah,
                    user_id
                `);

            if (statusFilter !== "all") {
                query = query.eq("status_persetujuan", statusFilter);
            }
            query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

            const { data, error } = await query;

            if (error) throw error;
            setArsipList(data || []);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch archives";
            console.error("Fetch error:", message);
            toast.error("Gagal memuat data arsip: " + message);
        } finally {
            setDataLoading(false);
        }
    }, [supabase, statusFilter, sortConfig]);

    // Initialize
    useEffect(() => {
        const initializePage = async () => {
            setAuthLoading(true);
            const isAuthorized = await checkAuth();
            if (isAuthorized) {
                await fetchArsipInaktif();
            }
            setAuthLoading(false);
        };
        initializePage();
    }, [checkAuth, fetchArsipInaktif]);

    // Handle Search and Filter
    useEffect(() => {
        const filtered = arsipList.filter(arsip => {
            const lowerSearchTerm = searchTerm.toLowerCase();
            const matchesSearch = searchTerm === "" ||
                (arsip.nomor_berkas?.toLowerCase().includes(lowerSearchTerm)) ||
                (arsip.kode_klasifikasi?.toLowerCase().includes(lowerSearchTerm)) ||
                (arsip.jenis_arsip?.toLowerCase().includes(lowerSearchTerm));
            return matchesSearch;
        });
        setFilteredArsip(filtered);
    }, [searchTerm, arsipList]);

    // Handle Status Update
    const updateStatus = async (newStatus: "Disetujui" | "Ditolak") => {
        if (selectedArsipIds.length === 0) {
            toast.warning("Pilih arsip yang akan diperbarui statusnya");
            return;
        }
        try {
            setDataLoading(true);
            const { data: arsipToUpdate, error: fetchError } = await supabase
                .from("arsip_inaktif")
                .select("id_arsip_inaktif, jenis_arsip, kode_klasifikasi, user_id")
                .in("id_arsip_inaktif", selectedArsipIds);
            if (fetchError || !arsipToUpdate) {
                throw fetchError || new Error("Gagal memuat data arsip untuk notifikasi");
            }
            const { error } = await supabase
                .from("arsip_inaktif")
                .update({ status_persetujuan: newStatus })
                .in("id_arsip_inaktif", selectedArsipIds);
            if (error) throw error;
            toast.success(`Berhasil ${newStatus === "Disetujui" ? "menyetujui" : "menolak"} ${selectedArsipIds.length} arsip`);
            setSelectedArsipIds([]);
            // Notifikasi ke pemilik arsip
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id;
            for (const arsip of arsipToUpdate) {
                if (arsip.user_id && arsip.user_id !== currentUserId) {
                    const notificationTitle = `Status Arsip Inaktif: ${newStatus}`;
                    const notificationMessage = `Arsip "${arsip.jenis_arsip}" (${arsip.kode_klasifikasi}) telah ${newStatus.toLowerCase()} oleh Sekretaris.`;
                    const link = `/arsip/arsip-inaktif/detail/${arsip.id_arsip_inaktif}`;
                    await sendUserNotification(
                        arsip.user_id,
                        notificationTitle,
                        notificationMessage,
                        link,
                        "arsip inaktif diverifikasi"
                    );
                }
            }
            await fetchArsipInaktif();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update status";
            console.error("Update error (message):", message);
            toast.error("Gagal memperbarui status: " + message);
        } finally {
            setDataLoading(false);
        }
    };

    const handleSortRequest = (key: 'nomor_berkas' | 'created_at') => {
        setSortConfig(currentSortConfig => {
            if (currentSortConfig.key === key) {
                return { key, direction: currentSortConfig.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIndicator = (key: 'nomor_berkas' | 'created_at') => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'asc' ? '↑' : '↓';
        }
        return <span className="opacity-0 group-hover:opacity-50 transition-opacity">↕</span>;
    };
    if (authLoading) {
        return null;
    }

    return (
        <div className="w-full h-full p-6">
            <div className="max-w-8xl mx-auto w-full h-full flex flex-col">
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                    {/* Header */}
                    <div className="bg-primary/10 px-6 py-4 flex justify-between items-center">
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-primary">
                            <FileCheck size={24} /> Verifikasi Arsip Inaktif
                        </h2>
                        {selectedArsipIds.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    className="px-4 py-2 bg-[hsl(var(--neon-green))] hover:bg-[hsl(var(--neon-green))]/90 text-black dark:text-background rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-md hover:shadow-lg hover:shadow-[hsl(var(--neon-green))]/30"
                                    onClick={() => updateStatus("Disetujui")}
                                    disabled={dataLoading}
                                >
                                    <CheckCircle2 size={18} />
                                    Setujui ({selectedArsipIds.length})
                                </button>
                                <button
                                    className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-md hover:shadow-lg hover:shadow-destructive/30"
                                    onClick={() => updateStatus("Ditolak")}
                                    disabled={dataLoading}
                                >
                                    <XCircle size={18} />
                                    Tolak ({selectedArsipIds.length})
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="px-6 py-4 border-y border-border/50">
                        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="relative flex-1 min-w-[250px] md:w-auto">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Cari arsip berdasarkan nomor, kode, atau uraian..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-colors duration-300"
                                    />
                                </div>
                                <div className="relative min-w-[180px]">
                                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
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
                                                        checked={selectedArsipIds.length === filteredArsip.length}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            if (checked) {
                                                                setSelectedArsipIds(filteredArsip.map(arsip => arsip.id_arsip_inaktif));
                                                            } else {
                                                                setSelectedArsipIds([]);
                                                            }
                                                        }}
                                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:bg-muted-foreground/10 group"
                                                    onClick={() => handleSortRequest('nomor_berkas')}
                                                >
                                                    No. Berkas <span className="ml-1">{getSortIndicator('nomor_berkas')}</span>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kode</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jenis Arsip</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kurun Waktu</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tingkat Perk.</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">No. Boks/Folder</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lokasi Simpan</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jumlah</th>
                                                <th
                                                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:bg-muted-foreground/10 group"
                                                    onClick={() => handleSortRequest('created_at')}
                                                >
                                                    Tgl. Pindah <span className="ml-1">{getSortIndicator('created_at')}</span>
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-card divide-y divide-border">
                                            {filteredArsip.map((arsip) => (
                                                <tr key={arsip.id_arsip_inaktif} className="hover:bg-muted/30 transition-colors duration-150">
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedArsipIds.includes(arsip.id_arsip_inaktif)}
                                                            onChange={(e) => {
                                                                const currentId = arsip.id_arsip_inaktif;
                                                                if (e.target.checked) {
                                                                    setSelectedArsipIds(prev => [...prev, currentId]);
                                                                } else {
                                                                    setSelectedArsipIds(prev => prev.filter(id => id !== currentId));
                                                                }
                                                            }}
                                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm whitespace-nowrap text-foreground">{arsip.nomor_berkas}</td>
                                                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap text-foreground">{arsip.kode_klasifikasi}</td>
                                                    <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate" title={arsip.jenis_arsip}>{arsip.jenis_arsip}</td>
                                                    <td className="px-4 py-3 text-sm text-center whitespace-nowrap text-foreground">{arsip.kurun_waktu || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-center text-foreground">{arsip.tingkat_perkembangan || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-center text-foreground">{arsip.nomor_definitif_folder_dan_boks || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-center text-foreground">{arsip.lokasi_simpan || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-center text-foreground">{arsip.jumlah}</td>
                                                    <td className="px-4 py-3 text-sm text-center whitespace-nowrap text-foreground">
                                                        {arsip.tanggal_pindah ? new Date(arsip.tanggal_pindah).toLocaleDateString('id-ID') : '-'}
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
                    </div>
                </div>
            </div>
        </div>
    );
}