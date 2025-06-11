"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, Eye, FileText, Filter, AlertTriangle, CalendarClock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { differenceInDays, parse } from "date-fns";
import Loading from "./loading";

interface ArsipRetensiRow {
    id_arsip_aktif: string;
    nomor_berkas: number;
    kode_klasifikasi: string;
    uraian_informasi: string;
    jangka_simpan: string | null; // Format "DD-MM-YYYY" atau "DD-MM-YYYY s.d. DD-MM-YYYY"
    kurun_waktu: string | null; // Periode penciptaan asli
    selisih_hari: number | null; // null jika jangka_simpan tidak valid
}

const RETENTION_FILTER_OPTIONS = [
    { value: "all", label: "Semua Jatuh Tempo", days: Infinity },
    { value: "1_month", label: "1 Bulan ke Depan", days: 30 },
    { value: "3_months", label: "3 Bulan ke Depan", days: 90 },
    { value: "6_months", label: "6 Bulan ke Depan", days: 180 },
    { value: "1_year", label: "1 Tahun ke Depan", days: 365 },
    { value: "2_years", label: "2 Tahun ke Depan", days: 730 },
    { value: "3_years", label: "3 Tahun ke Depan", days: 1095 },
    { value: "expired", label: "Sudah Lewat Tempo", days: -1 }, // -1 untuk menandakan sudah lewat
];

export default function RetensiArsipPage() {
    const supabase = createClient();
    const router = useRouter();

    const [allArsip, setAllArsip] = useState<ArsipRetensiRow[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [userBidangId, setUserBidangId] = useState<number | null>(null);
    const [selectedFilter, setSelectedFilter] = useState<string>("all");

    const ALLOWED_ROLE = "Pegawai";
    const SIGN_IN_PATH = "/sign-in";
    const DEFAULT_HOME_PATH = "/";

    const calculateRemainingDays = (jangkaSimpan: string | null): number | null => {
        if (!jangkaSimpan) return null;

        const parts = jangkaSimpan.split(" s.d. ");
        const endDateStringDMY = parts.length > 1 ? parts[1].trim() : parts[0].trim();

        if (!/^\d{2}-\d{2}-\d{4}$/.test(endDateStringDMY)) {
            console.warn(`Format tanggal akhir tidak valid di jangka_simpan: ${endDateStringDMY}`);
            return null;
        }

        try {
            const endDate = parse(endDateStringDMY, "dd-MM-yyyy", new Date());
            endDate.setHours(23, 59, 59, 999); // Set ke akhir hari

            if (isNaN(endDate.getTime())) {
                console.warn(`Objek tanggal akhir tidak valid dari jangka_simpan: ${endDateStringDMY}`);
                return null;
            }
            const today = new Date();
            today.setHours(0,0,0,0);
            return differenceInDays(endDate, today);
        } catch (error) {
            console.error(`Error parsing date string ${endDateStringDMY}:`, error);
            return null;
        }
    };

    const fetchData = useCallback(async () => {
        if (userBidangId === null) {
            setLoading(false);
            return;
        }
        setLoading(true);

        try {
            const { data: pemindahanLinks, error: pemindahanError } = await supabase
                .from('pemindahan_arsip_link')
                .select('id_arsip_aktif_fkey');

            if (pemindahanError) throw pemindahanError;
            const idsToExclude = pemindahanLinks?.map(link => link.id_arsip_aktif_fkey).filter(id => id != null) || [];

            let query = supabase
                .from("arsip_aktif")
                .select(`
                    id_arsip_aktif,
                    nomor_berkas,
                    kode_klasifikasi,
                    uraian_informasi,
                    jangka_simpan,
                    kurun_waktu,
                    lokasi_penyimpanan!inner(id_bidang_fkey)
                `)
                .eq('lokasi_penyimpanan.id_bidang_fkey', userBidangId)
                .eq('status_persetujuan', 'Disetujui'); // Hanya arsip yang disetujui

            if (idsToExclude.length > 0) {
                query = query.not('id_arsip_aktif', 'in', `(${idsToExclude.join(',')})`);
            }

            const { data, error } = await query;

            if (error) throw error;

            const processedData = (data || []).map(arsip => ({
                ...arsip,
                selisih_hari: calculateRemainingDays(arsip.jangka_simpan),
            })).filter(arsip => arsip.selisih_hari !== null); // Filter out invalid dates

            setAllArsip(processedData as ArsipRetensiRow[]);

        } catch (e: any) {
            toast.error("Gagal memuat data arsip retensi: " + e.message);
            setAllArsip([]);
        }
        setLoading(false);
    }, [supabase, userBidangId]);

    useEffect(() => {
        const checkAuth = async () => {
            setAuthLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push(SIGN_IN_PATH);
                setAuthLoading(false);
                return;
            }
            const { data: userData, error: userFetchError } = await supabase
                .from("users")
                .select("role, id_bidang_fkey")
                .eq("user_id", session.user.id)
                .single();

            if (userFetchError || !userData || !userData.role || userData.id_bidang_fkey === null) {
                toast.warn("Data pengguna tidak lengkap atau sesi tidak valid.");
                router.push(SIGN_IN_PATH);
                setAuthLoading(false);
                return;
            }
            if (userData.role !== ALLOWED_ROLE) {
                toast.warn("Anda tidak memiliki izin untuk mengakses halaman ini.");
                router.push(DEFAULT_HOME_PATH);
                setAuthLoading(false);
                return;
            }
            setUserBidangId(userData.id_bidang_fkey);
            setAuthLoading(false);
        };
        checkAuth();
    }, [router, supabase]);

    useEffect(() => {
        if (!authLoading && userBidangId !== null) {
            fetchData();
        }
    }, [authLoading, userBidangId, fetchData]);

    const filteredAndSortedArsip = useMemo(() => {
        let filtered = allArsip.filter(arsip =>
            (arsip.kode_klasifikasi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             arsip.uraian_informasi?.toLowerCase().includes(searchTerm.toLowerCase())) &&
            arsip.selisih_hari !== null // Pastikan selisih_hari tidak null
        );

        const filterOption = RETENTION_FILTER_OPTIONS.find(opt => opt.value === selectedFilter);
        if (filterOption) {
            if (filterOption.value === "expired") {
                filtered = filtered.filter(arsip => (arsip.selisih_hari as number) < 0);
            } else if (filterOption.value !== "all") {
                filtered = filtered.filter(arsip => (arsip.selisih_hari as number) >= 0 && (arsip.selisih_hari as number) <= filterOption.days);
            }
        }

        // If a specific filter is active (not "all"), then sort by selisih_hari
        if (selectedFilter !== "all" && filterOption) {
             // Sort by selisih_hari (ascending) for time-based filters
            return filtered.sort((a, b) => (a.selisih_hari as number) - (b.selisih_hari as number));
        } else {
            // Default sort: kode_klasifikasi (A-Z), then nomor_berkas (ascending)
            return filtered.sort((a, b) => {
                const kodeCompare = (a.kode_klasifikasi || "").localeCompare(b.kode_klasifikasi || "");
                return kodeCompare !== 0 ? kodeCompare : a.nomor_berkas - b.nomor_berkas;
            });
        }
    }, [allArsip, searchTerm, selectedFilter]);

    const paginatedArsip = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedArsip.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedArsip, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredAndSortedArsip.length / itemsPerPage);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const getStatusRetensi = (selisihHari: number | null) => {
        if (selisihHari === null) return { text: "Tanggal Tidak Valid", color: "text-gray-500" };
        if (selisihHari < 0) return { text: `Lewat ${Math.abs(selisihHari)} hari`, color: "text-red-500 font-semibold" };
        if (selisihHari === 0) return { text: "Jatuh Tempo Hari Ini", color: "text-orange-500 font-semibold" };
        return { text: `${selisihHari} hari lagi`, color: "text-green-600" };
    };

    if (authLoading || (loading && allArsip.length === 0)) {
        return <Loading />; 
    }

    return (
        <div className="w-full h-full p-6">
            <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
                <div className="card-neon rounded-xl overflow-hidden flex-grow flex flex-col">
                    <div className="bg-primary/10 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 rounded-lg">
                        <div className="flex-grow">
                            <h2 className="text-2xl font-bold flex items-center gap-2 text-primary">
                                <CalendarClock size={24} /> Daftar Arsip Jatuh Tempo Retensi
                            </h2>
                        </div>
                        <Link href="/arsip/pemindahan" passHref>
                            <button className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 text-sm font-medium transition-colors duration-200">
                                <FileText size={16} /> Mulai Pemindahan Arsip
                            </button>
                        </Link>
                    </div>

                    <div className="p-6 border-b border-border/50 flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-grow w-full md:w-auto">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                            <input
                                type="text"
                                placeholder="Cari kode klasifikasi atau uraian..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                        </div>
                        <div className="relative w-full md:w-auto md:min-w-[200px]">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                            <select
                                value={selectedFilter}
                                onChange={handleFilterChange}
                                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm"
                            >
                                {RETENTION_FILTER_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="p-6 flex-grow flex flex-col overflow-auto">
                        {loading && paginatedArsip.length === 0 ? (
                             <div className="flex-grow flex justify-center items-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                             </div>
                        ) : paginatedArsip.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-muted">
                                        <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            <th className="px-4 py-3">No. Berkas</th>
                                            <th className="px-4 py-3">Kode Klasifikasi</th>
                                            <th className="px-4 py-3">Uraian Informasi</th>
                                            <th className="px-4 py-3">Periode Aktif</th>
                                            <th className="px-4 py-3">Status Retensi</th>
                                            <th className="px-4 py-3 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-card divide-y divide-border">
                                        {paginatedArsip.map((arsip) => {
                                            const retensiStatus = getStatusRetensi(arsip.selisih_hari);
                                            return (
                                                <tr key={arsip.id_arsip_aktif} className="hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{arsip.nomor_berkas}</td>
                                                    <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{arsip.kode_klasifikasi}</td>
                                                    <td className="px-4 py-3 text-sm text-foreground max-w-sm truncate" title={arsip.uraian_informasi}>{arsip.uraian_informasi}</td>
                                                    <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{arsip.jangka_simpan || '-'}</td>
                                                    <td className={`px-4 py-3 text-sm whitespace-nowrap ${retensiStatus.color}`}>{retensiStatus.text}</td>
                                                    <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                                                        <Link href={`/arsip/arsip-aktif/detail/${arsip.id_arsip_aktif}`} passHref>
                                                            <button
                                                                className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary group"
                                                                title="Lihat Detail"
                                                            >
                                                                <Eye size={18} className="transform group-hover:scale-110 transition-transform" />
                                                            </button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-muted/30 rounded-lg flex-grow flex flex-col justify-center items-center">
                                <AlertTriangle size={48} className="mx-auto text-muted-foreground mb-3" />
                                <p className="mt-2 text-lg text-muted-foreground">
                                    Tidak ada arsip yang sesuai dengan filter retensi saat ini.
                                </p>
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-between items-center p-4 border-t border-border/50 mt-auto">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1 || loading}
                                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                            >
                                <ChevronLeft size={16} />
                                Sebelumnya
                            </button>
                            <span className="text-sm text-muted-foreground">
                                Halaman {currentPage} dari {totalPages} ({filteredAndSortedArsip.length} item)
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages || loading}
                                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                            >
                                Selanjutnya
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}