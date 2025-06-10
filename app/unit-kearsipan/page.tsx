"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaFileAlt, FaFolder, FaClock, FaChartBar, FaExternalLinkAlt } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { LoadingSkeleton } from "@/app/components/LoadingSkeleton";

interface Stats {
    totalArsip: number;
    arsipMenungguPersetujuan: number;
    arsipMendekatiBatasWaktu: number;
}

interface ArsipInaktif {
    id_arsip_inaktif: string;
    kode_klasifikasi: string;
    created_at: string;
    tanggal_berakhir: string;
}

interface StatusPersetujuan {
    name: string;
    jumlah: number;
}

// Stats Cards Component
function StatsCards({ stats, arsipMendekatiBerakhir }: { stats: Stats, arsipMendekatiBerakhir: ArsipInaktif[] }) {
    const calculateDaysRemaining = (endDate: string) => {
        const end = new Date(endDate);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const statsData = [
        {
            title: "Arsip Menunggu Persetujuan",
            value: stats.arsipMenungguPersetujuan,
            icon: FaFileAlt,
            colorClass: "primary",
            description: "Butuh tindakan"
        },
        {
            title: "Total Arsip di Record Centre",
            value: stats.totalArsip,
            icon: FaFolder,
            colorClass: "neon-green",
            description: "Semua dokumen"
        },
        {
            title: "Arsip Mendekati Masa Akhir",
            value: stats.arsipMendekatiBatasWaktu,
            icon: FaClock,
            colorClass: "neon-orange",
            description: "Perlu perhatian"
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {statsData.map((item, index) => (
                <div key={index} className="card-neon p-6 rounded-xl">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${item.colorClass === "primary" ? "bg-primary/10" :
                            item.colorClass === "neon-green" ? "bg-[hsl(var(--neon-green))]/20" :
                                item.colorClass === "neon-orange" ? "bg-[hsl(var(--neon-orange))]/20" :
                                    "bg-destructive/10"
                            }`}>
                            <item.icon className={`w-6 h-6 ${item.colorClass === "primary" ? "text-primary" :
                                item.colorClass === "neon-green" ? "text-[hsl(var(--neon-green))]" :
                                    item.colorClass === "neon-orange" ? "text-[hsl(var(--neon-orange))]" :
                                        "text-destructive"
                                }`} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{item.title}</p>
                            <p className="text-2xl font-bold text-foreground">{item.value}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                    </div>
                    {item.colorClass === "neon-orange" && arsipMendekatiBerakhir.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {arsipMendekatiBerakhir
                                .filter(arsip => calculateDaysRemaining(arsip.tanggal_berakhir) <= 7)
                                .slice(0, 2)
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
            ))}
        </div>
    );
}

// Status Chart Component
function StatusChart({ data }: { data: StatusPersetujuan[] }) {
    const CHART_COLORS = {
        "Belum Diproses": "hsl(45, 100%, 60%)",
        "Disetujui": "hsl(142, 72%, 29%)",
        "Ditolak": "hsl(0, 84%, 60%)"
    };

    return (
        <div className="lg:col-span-2 card-neon p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <FaChartBar className="text-primary" />
                Status Persetujuan Arsip
            </h3>

            {data.some(s => s.jumlah > 0) ? (
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height={430}>
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis allowDecimals={false} fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '0.5rem'
                                }}
                                formatter={(value) => [value, "Jumlah Arsip"]}
                            />
                            <Legend wrapperStyle={{ fontSize: "14px" }} />
                            <Bar
                                dataKey="jumlah"
                                name="Jumlah Arsip"
                                radius={[4, 4, 0, 0]}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[entry.name as keyof typeof CHART_COLORS] || 'hsl(var(--primary))'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                        <FaFolder className="mx-auto w-12 h-12 mb-4 opacity-50" />
                        <p>Belum ada data status persetujuan.</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Recent Archives Component
function RecentArchives({ archives, totalArchives }: { archives: ArsipInaktif[], totalArchives: number }) {
    return (
        <div className="card-neon p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <FaFolder className="text-primary" />
                Arsip Terbaru
            </h3>

            <div className="space-y-4">
                {archives.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Belum ada arsip terbaru
                    </div>
                ) : (
                    archives.map((arsip) => (
                        <div key={arsip.id_arsip_inaktif} className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-sm text-foreground">{arsip.kode_klasifikasi}</p>
                                <span className="text-xs text-muted-foreground">
                                    {new Date(arsip.created_at).toLocaleDateString('id-ID')}
                                </span>
                            </div>
                            <Link
                                href={`/unit-kearsipan/verifikasi-arsip/${arsip.id_arsip_inaktif}`}
                                className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                            >
                                Lihat Detail <FaExternalLinkAlt size={10} />
                            </Link>
                        </div>
                    ))
                )}
            </div>

            {totalArchives > 5 && (
                <Link
                    href="/unit-kearsipan/verifikasi-arsip"
                    className="text-sm text-primary hover:underline mt-4 inline-block"
                >
                    Lihat Selengkapnya...
                </Link>
            )}
        </div>
    );
}

// Loading Skeletons
function StatsLoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, index) => (
                <div key={index} className="card-neon p-6 rounded-xl animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-lg"></div>
                        <div className="flex-1">
                            <div className="h-3 bg-muted rounded mb-2"></div>
                            <div className="h-6 bg-muted rounded mb-1"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ChartLoadingSkeleton() {
    return (
        <div className="lg:col-span-2 card-neon p-6 rounded-xl">
            <div className="animate-pulse">
                <div className="h-6 bg-muted rounded mb-6 w-3/4"></div>
                <div className="h-[300px] bg-muted rounded"></div>
            </div>
        </div>
    );
}

function ArchivesLoadingSkeleton() {
    return (
        <div className="card-neon p-6 rounded-xl">
            <div className="animate-pulse">
                <div className="h-6 bg-muted rounded mb-6 w-1/2"></div>
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-4 bg-muted rounded-lg">
                            <div className="h-4 bg-muted-foreground/20 rounded mb-2 w-3/4"></div>
                            <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Main Dashboard Component
function DashboardContent() {
    const supabase = createClient();
    const router = useRouter();

    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [stats, setStats] = useState<Stats>({
        totalArsip: 0,
        arsipMenungguPersetujuan: 0,
        arsipMendekatiBatasWaktu: 0
    });

    const [statusPersetujuan, setStatusPersetujuan] = useState<StatusPersetujuan[]>([
        { name: "Belum Diproses", jumlah: 0 },
        { name: "Disetujui", jumlah: 0 },
        { name: "Ditolak", jumlah: 0 }
    ]);
    const [arsipTerbaru, setArsipTerbaru] = useState<ArsipInaktif[]>([]);
    const [arsipMendekatiBerakhir, setArsipMendekatiBerakhir] = useState<ArsipInaktif[]>([]);

    const ALLOWED_ROLE = "Sekretaris";
    const SIGN_IN_PATH = "/sign-in";
    const DEFAULT_HOME_PATH = "/";

    const checkAuth = useCallback(async () => {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) throw new Error("No active session");

            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("role")
                .eq("user_id", session.user.id)
                .single();

            if (userError || !userData?.role) {
                throw new Error("Invalid user data");
            }

            if (userData.role !== ALLOWED_ROLE) {
                throw new Error("Unauthorized role");
            }

            return true;

        } catch (authError) {
            const message = authError instanceof Error ? authError.message : "Authentication error";
            console.error("Auth error:", message);
            router.push(message === "Unauthorized role" ? DEFAULT_HOME_PATH : SIGN_IN_PATH);
            return false;
        }
    }, [router, supabase]);

    const fetchDashboardData = useCallback(async () => {
        try {
            setDataLoading(true);
            setError(null);

            const { count: total, error: totalError } = await supabase
                .from("arsip_inaktif")
                .select("id_arsip_inaktif", { count: "exact", head: true });

            if (totalError) throw totalError;

            const { count: menungguCount, error: menungguError } = await supabase
                .from("arsip_inaktif")
                .select("id_arsip_inaktif", { count: "exact", head: true })
                .eq("status_persetujuan", "Menunggu");

            if (menungguError) throw menungguError;

            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            const { data: deadlineData, count: deadlineCount, error: deadlineError } = await supabase
                .from("arsip_inaktif")
                .select("id_arsip_inaktif, kode_klasifikasi, created_at, tanggal_berakhir", { count: "exact" })
                .lte("tanggal_berakhir", thirtyDaysFromNow.toISOString())
                .gt("tanggal_berakhir", new Date().toISOString())
                .order("tanggal_berakhir", { ascending: true });

            if (deadlineError) throw deadlineError;

            const { data: statusData, error: statusError } = await supabase
                .from("arsip_inaktif")
                .select("status_persetujuan");

            if (statusError) throw statusError;

            const statusCounts: { [key: string]: number } = {
                "Belum Diproses": 0,
                "Disetujui": 0,
                "Ditolak": 0
            };

            statusData?.forEach(item => {
                if (item.status_persetujuan in statusCounts) {
                    statusCounts[item.status_persetujuan as keyof typeof statusCounts]++;
                }
            });

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

        } catch (fetchError) {
            const message = fetchError instanceof Error ? fetchError.message : "Failed to fetch dashboard data";
            console.error("Dashboard error:", message);
            setError(message);
            toast.error("Gagal memuat data dashboard.");
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

    if (authLoading || (dataLoading && !stats.totalArsip)) {
        return null; // The loading.tsx will handle this
    }

    if (error) {
        return (
            <div className="bg-background flex flex-col items-center justify-center p-6 w-full h-full">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-foreground mb-4">Terjadi Kesalahan</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <button
                        onClick={() => fetchDashboardData}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background p-6 w-full h-full">
            <div className="max-w-screen-2xl mx-auto w-full h-full space-y-8">
                {/* Stats Cards */}
                <Suspense fallback={<StatsLoadingSkeleton />}>
                    {dataLoading ? <StatsLoadingSkeleton /> : <StatsCards stats={stats} arsipMendekatiBerakhir={arsipMendekatiBerakhir} />}
                </Suspense>

                {/* Charts and Recent Archives */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Suspense fallback={<ChartLoadingSkeleton />}>
                        {dataLoading ? <ChartLoadingSkeleton /> : <StatusChart data={statusPersetujuan} />}
                    </Suspense>

                    <Suspense fallback={<ArchivesLoadingSkeleton />}>
                        {dataLoading ? <ArchivesLoadingSkeleton /> : <RecentArchives archives={arsipTerbaru} totalArchives={stats.totalArsip} />}
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

export default function SekretarisHome() {
    return (
        <Suspense fallback={
            <div className="bg-background p-6 w-full h-full">
                <div className="max-w-screen-2xl mx-auto h-full flex items-center justify-center">
                    <LoadingSkeleton />
                </div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}