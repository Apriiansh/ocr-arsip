"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
    FaFileAlt, 
    FaFolder, 
    FaClock, 
    FaChartBar,
    FaExternalLinkAlt
} from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { LoadingSkeleton } from "@/app/components/LoadingSkeleton";

interface ArsipInaktif {
    id_arsip_inaktif: string;
    kode_klasifikasi: string;
    created_at: string;
    tanggal_berakhir: string;
}

export default function SekretarisHome() {
    const supabase = createClient();
    const router = useRouter();
    
    // State Management
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        totalArsip: 0,
        arsipMenungguPersetujuan: 0,
        arsipMendekatiBatasWaktu: 0
    });
    const [statusPersetujuan, setStatusPersetujuan] = useState([
        { name: "Belum Diproses", jumlah: 0 },
        { name: "Disetujui", jumlah: 0 },
        { name: "Ditolak", jumlah: 0 }
    ]);
    const [arsipTerbaru, setArsipTerbaru] = useState<ArsipInaktif[]>([]);
    const [arsipMendekatiBerakhir, setArsipMendekatiBerakhir] = useState<ArsipInaktif[]>([]);

    // Constants
    const ALLOWED_ROLE = "Sekretaris";
    const SIGN_IN_PATH = "/sign-in";
    const DEFAULT_HOME_PATH = "/";
    const CHART_COLORS = {
        "Belum Diproses": "hsl(45, 100%, 60%)", // Warm yellow
        "Disetujui": "hsl(142, 72%, 29%)", // Green
        "Ditolak": "hsl(0, 84%, 60%)" // Red from destructive
    };

    // Helper function to calculate days remaining
    const calculateDaysRemaining = (endDate: string) => {
        const end = new Date(endDate);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

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

    // Data Fetching
    const fetchDashboardData = useCallback(async () => {
        try {
            setDataLoading(true);
            setError(null);

            // Fetch total arsip
            const { count: total, error: totalError } = await supabase
                .from("arsip_inaktif")
                .select("id_arsip_inaktif", { count: "exact", head: true });

            if (totalError) throw totalError;

            // Fetch arsip menunggu persetujuan
            const { count: menungguCount, error: menungguError } = await supabase
                .from("arsip_inaktif")
                .select("id_arsip_inaktif", { count: "exact", head: true })
                .eq("status_persetujuan", "Menunggu");

            if (menungguError) throw menungguError;

            // Fetch arsip mendekati batas waktu (30 hari ke depan)
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            const { data: deadlineData, count: deadlineCount, error: deadlineError } = await supabase
                .from("arsip_inaktif")
                .select("id_arsip_inaktif, kode_klasifikasi, created_at, tanggal_berakhir", { count: "exact" })
                .lte("tanggal_berakhir", thirtyDaysFromNow.toISOString())
                .gt("tanggal_berakhir", new Date().toISOString())
                .order("tanggal_berakhir", { ascending: true });

            if (deadlineError) throw deadlineError;

            // Fetch status distribution
            const { data: statusData, error: statusError } = await supabase
                .from("arsip_inaktif")
                .select("status_persetujuan");

            if (statusError) throw statusError;

            const statusCounts = {
                "Belum Diproses": 0,
                "Disetujui": 0,
                "Ditolak": 0
            };

            statusData?.forEach(item => {
                if (item.status_persetujuan in statusCounts) {
                    statusCounts[item.status_persetujuan as keyof typeof statusCounts]++;
                }
            });

            // Fetch arsip terbaru
            const { data: arsipBaru, error: arsipError } = await supabase
                .from("arsip_inaktif")
                .select("id_arsip_inaktif, kode_klasifikasi, created_at, tanggal_berakhir")
                .order("created_at", { ascending: false })
                .limit(5);

            if (arsipError) throw arsipError;

            setStats({
                totalArsip: total || 0,
                arsipMenungguPersetujuan: menungguCount || 0,
                arsipMendekatiBatasWaktu: deadlineCount || 0
            });

            setStatusPersetujuan([
                { name: "Belum Diproses", jumlah: statusCounts["Belum Diproses"] },
                { name: "Disetujui", jumlah: statusCounts["Disetujui"] },
                { name: "Ditolak", jumlah: statusCounts["Ditolak"] }
            ]);

            setArsipTerbaru(arsipBaru || []);
            setArsipMendekatiBerakhir(deadlineData || []);

        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch dashboard data";
            console.error("Dashboard error:", message);
            setError(message);
            toast.error("Gagal memuat data dashboard: " + message);
        } finally {
            setDataLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        const initializeDashboard = async () => {
            setAuthLoading(true);
            const isAuthorized = await checkAuth();
            if (isAuthorized) {
                await fetchDashboardData();
            }
            setAuthLoading(false);
        };

        initializeDashboard();
    }, [checkAuth, fetchDashboardData]);

    if (authLoading || dataLoading) {
        // Konsisten dengan wrapper loading di halaman Kepala Bidang
        return (
            <div className="bg-background p-6 w-full h-full"> {/* Added h-full */}
                <div className="max-w-screen-2xl mx-auto h-full flex items-center justify-center"> {/* Added h-full and centering for skeleton */}
                    <LoadingSkeleton />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-background flex flex-col items-center justify-center p-6 w-full h-full"> {/* Added h-full, removed flex-grow */}
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-foreground mb-4">Terjadi Kesalahan</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <button
                        onClick={fetchDashboardData} // Atau handleRefresh jika ada fungsi refresh khusus
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background p-6 w-full h-full"> {/* Added h-full */}
            <div className="max-w-screen-2xl mx-auto w-full h-full space-y-8" > {/* Added h-full to content container */}
                
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10"> {/* Disesuaikan: md, lg tetap 3 karena ada 3 kartu, mb-10 */}
                    <div className="card-neon p-6 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-full">
                                <FaFileAlt className="text-primary text-2xl" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Arsip Menunggu Persetujuan</p>
                                <p className="text-2xl font-bold text-foreground">{stats.arsipMenungguPersetujuan}</p>
                            </div>
                        </div>
                    </div>

                    <div className="card-neon p-6 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-[hsl(var(--neon-green))]/20 p-3 rounded-full">
                                <FaFolder className="text-[hsl(var(--neon-green))] text-2xl" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Arsip di Record Centre</p>
                                <p className="text-2xl font-bold text-foreground">{stats.totalArsip}</p>
                            </div>
                        </div>
                    </div>

                    <div className="card-neon p-6 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-[hsl(var(--neon-orange))]/20 p-3 rounded-full">
                                <FaClock className="text-[hsl(var(--neon-orange))] text-2xl" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Arsip Mendekati Masa Akhir</p>
                                <p className="text-2xl font-bold text-foreground">{stats.arsipMendekatiBatasWaktu}</p>
                                {arsipMendekatiBerakhir.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {arsipMendekatiBerakhir
                                            .filter(arsip => calculateDaysRemaining(arsip.tanggal_berakhir) <= 7)
                                            .map(arsip => (
                                                <div key={arsip.id_arsip_inaktif} className="text-xs">
                                                    <span className="font-medium">{arsip.kode_klasifikasi}</span>
                                                    <span className="text-destructive ml-2">
                                                        {calculateDaysRemaining(arsip.tanggal_berakhir)} hari lagi
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Status Persetujuan Chart */}
                    <div className="lg:col-span-2 card-neon p-6 rounded-xl">
                        <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                            <FaChartBar className="text-primary" />
                            Status Persetujuan Arsip
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statusPersetujuan}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '0.5rem'
                                        }}
                                    />
                                    <Bar 
                                        dataKey="jumlah" 
                                        fill="hsl(var(--primary))"
                                        radius={[4, 4, 0, 0]}
                                    >
                                        {statusPersetujuan.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[entry.name as keyof typeof CHART_COLORS]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Arsip Terbaru */}
                    <div className="card-neon p-6 rounded-xl">
                        <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                            <FaFolder className="text-primary" />
                            Arsip Terbaru
                        </h3>
                        <div className="space-y-4">
                            {arsipTerbaru.length > 0 ? (
                                arsipTerbaru.map((arsip) => (
                                    <div
                                        key={arsip.id_arsip_inaktif}
                                        className="p-4 bg-muted/50 rounded-lg"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-medium text-sm text-foreground">{arsip.kode_klasifikasi}</p>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(arsip.created_at).toLocaleDateString('id-ID')}
                                            </span>
                                        </div>
                                        <Link
                                            href={`/unit-kearsipan/verifikasi-arsip/${arsip.id_arsip_inaktif}`}
                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                        >
                                            Lihat Detail
                                            <FaExternalLinkAlt size={10} />
                                        </Link>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Belum ada arsip terbaru
                                </div>
                            )}
                        </div>
                        <Link
                            href="/unit-kearsipan/verifikasi-arsip"
                            className="text-sm text-primary hover:underline mt-4 inline-block"
                        >
                            Lihat Selengkapnya...
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}