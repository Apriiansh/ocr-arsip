"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaFolder, FaCheckCircle, FaTasks, FaHourglassHalf, FaSync } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";

// Komponen untuk chart yang dapat di-stream
function StatusChart({ data }: { data: any[] }) {
    return (
        <div className="lg:col-span-2 card-neon p-6 rounded-xl flex flex-col">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <FaCheckCircle className="text-primary" />
                Status Persetujuan Arsip
            </h3>
            {data.length > 0 ? (
                <div className="flex-1 min-h-0"> {/* Wrapper untuk mengambil sisa ruang */}
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis allowDecimals={false} fontSize={12}/>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '0.5rem'
                                }}
                                labelStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Legend wrapperStyle={{ fontSize: "14px" }} />
                            <Bar
                                dataKey="jumlah"
                                name="Jumlah Arsip"
                                radius={[4, 4, 0, 0]}
                                // Atribut 'fill' diambil dari data, jadi tidak perlu di sini
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground"> {/* Placeholder juga mengambil sisa ruang */}
                    Tidak ada data status persetujuan
                </div>
            )}
        </div>
    );
}

// Komponen untuk daftar arsip terbaru
function RecentArchives({ archives, totalArchives }: { archives: any[], totalArchives: number }) {
    return (
        <div className="card-neon p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <FaFolder className="text-primary" />
                Arsip Terbaru
            </h3>
            <div className="space-y-4">
                {archives.length > 0 ? (
                    archives.map((arsip) => (
                        <div
                            key={arsip.id_arsip_aktif}
                            className={`p-4 rounded-lg border ${
                                arsip.status_persetujuan === 'Menunggu' 
                                    ? 'bg-[hsl(var(--neon-orange))]/10 border-[hsl(var(--neon-orange))]/30'
                                    : arsip.status_persetujuan === 'Disetujui' 
                                    ? 'bg-[hsl(var(--neon-green))]/10 border-[hsl(var(--neon-green))]/30'
                                    : 'bg-destructive/10 border-destructive/30'
                            }`}
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground truncate">
                                        {arsip.kode_klasifikasi}
                                    </p>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {arsip.uraian_informasi}
                                    </p>
                                    <p className="text-xs text-muted-foreground/80 mt-1">
                                        {new Date(arsip.created_at).toLocaleDateString('id-ID')}
                                    </p>
                                </div>
                                <span
                                    className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                                        arsip.status_persetujuan === 'Menunggu'
                                            ? 'bg-[hsl(var(--neon-orange))] text-black/80 dark:text-black/90'
                                            : arsip.status_persetujuan === 'Disetujui' 
                                            ? 'bg-[hsl(var(--neon-green))] text-black/80 dark:text-black/90'
                                            : 'bg-destructive text-destructive-foreground'
                                    }`}
                                >
                                    {arsip.status_persetujuan}
                                </span>
                            </div>
                            <Link
                                href={`/arsip/arsip-aktif/detail/${arsip.id_arsip_aktif}`}
                                className="text-xs text-primary hover:underline mt-2 inline-block"
                            >
                                Lihat Detail
                            </Link>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        Belum ada arsip terbaru
                    </div>
                )}
            </div>
            {totalArchives > 5 && (
                <Link
                    href="/arsip/arsip-aktif/daftar-aktif"
                    className="text-sm text-primary hover:underline mt-4 block text-center"
                >
                    Lihat Semua Arsip ({totalArchives})
                </Link>
            )}
        </div>
    );
}

export default function KepalaBidangHome() {
    const supabase = createClient();
    const router = useRouter();
    
    // State Management
    const [dataLoading, setDataLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalArsip: 0,
        arsipMenunggu: 0,
        arsipDisetujui: 0,
        arsipDitolak: 0
    });
    const [userName, setUserName] = useState<string | null>(null);
    const [userBidang, setUserBidang] = useState<string | null>(null);
    const [arsipStatusBidangData, setArsipStatusBidangData] = useState<any[]>([]);
    const [daftarSemuaArsipBidang, setDaftarSemuaArsipBidang] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Constants
    const ALLOWED_ROLE = "Kepala_Bidang";
    const SIGN_IN_PATH = "/sign-in";
    const DEFAULT_HOME_PATH = "/";
    const REFRESH_INTERVAL = 300000; // 5 minutes

    // Authentication Check
    const checkAuth = useCallback(async () => {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                throw new Error("No active session");
            }

            const name = session.user?.user_metadata?.full_name || session.user?.email;
            setUserName(name || "Kepala Bidang");

            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("role, id_bidang_fkey")
                .eq("user_id", session.user.id)
                .single();

            if (userError || !userData || !userData.role || userData.id_bidang_fkey === null) {
                throw new Error("Invalid user data");
            }

            if (userData.role !== ALLOWED_ROLE) {
                throw new Error("Unauthorized role");
            }

            const { data: bidangData, error: bidangError } = await supabase
                .from("daftar_bidang")
                .select("nama_bidang")
                .eq("id_bidang", userData.id_bidang_fkey)
                .single();

            if (bidangError) {
                console.error("Error fetching bidang:", bidangError);
            }

            setUserBidang(bidangData?.nama_bidang || null);
            return userData.id_bidang_fkey;

        } catch (error) {
            const message = error instanceof Error ? error.message : "Authentication error";
            console.error("Auth error:", message);
            router.push(message === "Unauthorized role" ? DEFAULT_HOME_PATH : SIGN_IN_PATH);
            return null;
        }
    }, [router, supabase]);

    // Data Fetching
    const fetchDashboardData = useCallback(async (bidangId: number) => {
        try {
            setDataLoading(true);
            setError(null);

            // Fetch locations in department
            const { data: lokasiDiBidang, error: lokasiError } = await supabase
                .from("lokasi_penyimpanan")
                .select("id_lokasi")
                .eq("id_bidang_fkey", bidangId);

            if (lokasiError) throw lokasiError;

            const lokasiIds = lokasiDiBidang?.map(l => l.id_lokasi) || [];
            if (lokasiIds.length === 0) {
                setStats({ totalArsip: 0, arsipMenunggu: 0, arsipDisetujui: 0, arsipDitolak: 0 });
                setArsipStatusBidangData([]);
                setDaftarSemuaArsipBidang([]);
                return;
            }

            // Fetch archives
            const { data: arsipData, error: arsipError } = await supabase
                .from("arsip_aktif")
                .select(`
                    id_arsip_aktif,
                    kode_klasifikasi,
                    uraian_informasi,
                    status_persetujuan,
                    created_at,
                    user_id
                `)
                .in("id_lokasi_fkey", lokasiIds)
                .order("created_at", { ascending: false });

            if (arsipError) throw arsipError;

            // Process statistics
            const stats = {
                totalArsip: arsipData.length,
                arsipMenunggu: arsipData.filter(a => a.status_persetujuan === "Menunggu").length,
                arsipDisetujui: arsipData.filter(a => a.status_persetujuan === "Disetujui").length,
                arsipDitolak: arsipData.filter(a => a.status_persetujuan === "Ditolak").length
            };

            const chartData = [
                { name: "Disetujui", jumlah: stats.arsipDisetujui, fill: "hsl(var(--chart-1))" },
                { name: "Menunggu", jumlah: stats.arsipMenunggu, fill: "hsl(var(--chart-2))" },
                { name: "Ditolak", jumlah: stats.arsipDitolak, fill: "hsl(var(--chart-3))" }
            ].filter(d => d.jumlah > 0);

            setStats(stats);
            setArsipStatusBidangData(chartData);
            setDaftarSemuaArsipBidang(arsipData.slice(0, 5));

        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch dashboard data";
            console.error("Dashboard error:", message);
            setError(message);
            toast.error("Gagal memuat data dashboard");
        } finally {
            setDataLoading(false);
            setRefreshing(false);
        }
    }, [supabase]);

    // Initial Load
    useEffect(() => {
        const initializeDashboard = async () => {
            const bidangId = await checkAuth();
            if (bidangId) {
                await fetchDashboardData(bidangId);
            }
        };

        initializeDashboard();
    }, [checkAuth, fetchDashboardData]);

    // Auto Refresh
    useEffect(() => {
        const interval = setInterval(async () => {
            const bidangId = await checkAuth();
            if (bidangId) {
                await fetchDashboardData(bidangId);
            }
        }, REFRESH_INTERVAL);

        return () => clearInterval(interval);
    }, [checkAuth, fetchDashboardData]);

    // Manual Refresh Handler
    const handleRefresh = async () => {
        setRefreshing(true);
        const bidangId = await checkAuth();
        if (bidangId) {
            await fetchDashboardData(bidangId);
        }
    };
    
    return (
        <div className="bg-background p-6 w-full h-full">
            <div className="max-w-screen-2xl mx-auto w-full h-full space-y-8">
                {/* Header dengan refresh button */}
                <div className="flex justify-between items-center">
                   <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                    >
                        <FaSync className={refreshing ? "animate-spin" : ""} />
                        {refreshing ? "Memuat..." : "Refresh"}
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="card-neon p-6 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-full">
                                <FaFolder className="text-primary text-2xl" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Arsip Aktif</p>
                                <p className="text-2xl font-bold">{stats.totalArsip}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card-neon p-6 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-[hsl(var(--neon-green))]/20 p-3 rounded-full">
                                <FaCheckCircle className="text-[hsl(var(--neon-green))] text-2xl" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Arsip Disetujui</p>
                                <p className="text-2xl font-bold text-foreground">{stats.arsipDisetujui}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card-neon p-6 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-[hsl(var(--neon-orange))]/20 p-3 rounded-full">
                                <FaHourglassHalf className="text-[hsl(var(--neon-orange))] text-2xl" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Menunggu Persetujuan</p>
                                <p className="text-2xl font-bold text-foreground">{stats.arsipMenunggu}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card-neon p-6 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-destructive/20 p-3 rounded-full">
                                <FaTasks className="text-destructive text-2xl" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Arsip Ditolak</p>
                                <p className="text-2xl font-bold">{stats.arsipDitolak}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Suspense fallback={
                        <div className="lg:col-span-2 card-neon p-6 rounded-xl">
                            <div className="animate-pulse">
                                <div className="h-6 bg-muted rounded mb-6"></div>
                                <div className="h-[300px] bg-muted rounded"></div>
                            </div>
                        </div>
                    }>
                        <StatusChart data={arsipStatusBidangData} />
                    </Suspense>

                    <Suspense fallback={
                        <div className="card-neon p-6 rounded-xl">
                            <div className="animate-pulse">
                                <div className="h-6 bg-muted rounded mb-6"></div>
                                <div className="space-y-4">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="p-4 bg-muted rounded-lg">
                                            <div className="h-4 bg-muted-foreground/20 rounded mb-2"></div>
                                            <div className="h-3 bg-muted-foreground/20 rounded"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    }>
                        <RecentArchives archives={daftarSemuaArsipBidang} totalArchives={stats.totalArsip} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}