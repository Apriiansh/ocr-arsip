"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
    FaUsers,
    FaUserTie,
    FaUserEdit,
    FaHistory,
    FaChartBar,
} from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import { LoadingSkeleton } from "@/app/components/LoadingSkeleton";
import Loading from "./loading";

interface UserActivityStat {
    name: string;
    count: number;
}

interface Stats {
    totalPegawai: number;
    totalKepalaBidang: number;
    totalSekretaris: number;
}

// Stats Cards Component
function StatsCards({ stats }: { stats: Stats }) {
    const statsData = [
        {
            title: "Pegawai",
            value: stats.totalPegawai,
            icon: FaUsers,
            colorClass: "primary",
            description: "Pengguna dengan role pegawai"
        },
        {
            title: "Kepala Bidang",
            value: stats.totalKepalaBidang,
            icon: FaUserTie,
            colorClass: "neon-blue",
            description: "Pengguna dengan role kepala bidang"
        },
        {
            title: "Sekretaris",
            value: stats.totalSekretaris,
            icon: FaUserEdit,
            colorClass: "neon-purple",
            description: "Pengguna dengan role sekretaris"
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {statsData.map((item, index) => (
                <div key={index} className="bg-card p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-border">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${item.colorClass === "primary" ? "bg-primary/10" :
                                item.colorClass === "neon-blue" ? "bg-[hsl(var(--neon-blue))]/10" :
                                    "bg-[hsl(var(--neon-purple))]/10"
                            }`}>
                            <item.icon className={`w-6 h-6 ${item.colorClass === "primary" ? "text-primary" :
                                    item.colorClass === "neon-blue" ? "text-[hsl(var(--neon-blue))]" :
                                        "text-[hsl(var(--neon-purple))]"
                                }`} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{item.title}</p>
                            <p className="text-2xl font-bold text-foreground">{item.value}</p>
                            {/* <p className="text-xs text-muted-foreground mt-1">{item.description}</p> */}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Chart Component
function ActivityChart({ userActivityStats }: { userActivityStats: UserActivityStat[] }) {
    return (
        <div className="bg-card p-6 rounded-xl shadow-md border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
                <FaChartBar className="text-primary" /> Aktivitas Pengguna dalam Mengelola Arsip
            </h3>

            {userActivityStats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <FaHistory className="mx-auto w-12 h-12 mb-4 opacity-50" />
                    <p>Belum ada data aktivitas pengguna.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height={550}>
                            <BarChart
                                data={userActivityStats}
                                margin={{ top: 20, right: 30, left: 30, bottom: 80 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis
                                    dataKey="name"
                                    angle={0}
                                    textAnchor="middle"
                                    height={100}
                                    interval={0}
                                    fontSize={12}
                                />
                                <YAxis allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '0.5rem'
                                    }}
                                    formatter={(value, name) => [
                                        value, "Total Arsip"
                                    ]}
                                />
                                <Bar
                                    dataKey="count"
                                    name="count"
                                    fill="hsl(var(--primary))"
                                    radius={[2, 2, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}

// Loading Skeleton for Stats
function StatsLoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, index) => (
                <div key={index} className="bg-card p-6 rounded-xl shadow-md border border-border animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-lg"></div>
                        <div className="flex-1">
                            <div className="h-3 bg-muted rounded mb-2"></div>
                            <div className="h-6 bg-muted rounded mb-1"></div>
                            <div className="h-2 bg-muted rounded"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Loading Skeleton for Chart
function ChartLoadingSkeleton() {
    return (
        <div className="bg-card p-6 rounded-xl shadow-md border border-border">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 bg-muted rounded animate-pulse"></div>
                <div className="h-5 bg-muted rounded w-96 animate-pulse"></div>
            </div>
            <div className="h-[400px] bg-muted rounded animate-pulse"></div>
        </div>
    );
}

// Main Dashboard Component
function AdminDashboardContent() {
    const supabase = createClient();
    const router = useRouter();

    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [stats, setStats] = useState<Stats>({
        totalPegawai: 0,
        totalKepalaBidang: 0,
        totalSekretaris: 0,
    });

    const [userActivityStats, setUserActivityStats] = useState<UserActivityStat[]>([]);

    const ALLOWED_ROLE = "Admin";
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

            if (userError || !userData?.role) throw new Error("Invalid user data");
            if (userData.role !== ALLOWED_ROLE) throw new Error("Unauthorized role");

            return true;
        } catch (authError) {
            const message = authError instanceof Error ? authError.message : "Authentication error";
            console.error("Auth error:", message);
            router.push(message === "Unauthorized role" ? DEFAULT_HOME_PATH : SIGN_IN_PATH);
            return false;
        }
    }, [router, supabase]);

    const fetchDashboardData = useCallback(async () => {
        setDataLoading(true);
        setError(null);
        try {
            // Fetch role-based user counts
            const { count: totalPegawai, error: pegawaiError } = await supabase
                .from("users")
                .select("user_id", { count: "exact", head: true })
                .eq("role", "Pegawai");
            if (pegawaiError) throw pegawaiError;

            const { count: totalKepalaBidang, error: kepalaBidangError } = await supabase
                .from("users")
                .select("user_id", { count: "exact", head: true })
                .eq("role", "Kepala_Bidang");
            if (kepalaBidangError) throw kepalaBidangError;

            const { count: totalSekretaris, error: sekretarisError } = await supabase
                .from("users")
                .select("user_id", { count: "exact", head: true })
                .eq("role", "Sekretaris");
            if (sekretarisError) throw sekretarisError;

            setStats({
                totalPegawai: totalPegawai || 0,
                totalKepalaBidang: totalKepalaBidang || 0,
                totalSekretaris: totalSekretaris || 0,
            });

            // Fetch user activity statistics
            const { data: usersData, error: usersError } = await supabase
                .from("users")
                .select("user_id, nama, email");
            if (usersError) throw usersError;

            const userActivityMap = new Map<string, { count: number, name: string }>();
            usersData?.forEach(user => {
                const displayName = user.nama || user.email || `User (${user.user_id.substring(0, 8)})`;
                userActivityMap.set(user.user_id, { count: 0, name: displayName });
            });

            // Activity from arsip_aktif
            const { data: arsipAktifActivity, error: arsipAktifError } = await supabase
                .from("arsip_aktif")
                .select("user_id")
                .not("user_id", "is", null);
            if (arsipAktifError) throw arsipAktifError;

            arsipAktifActivity?.forEach(item => {
                if (item.user_id && userActivityMap.has(item.user_id)) {
                    const current = userActivityMap.get(item.user_id)!;
                    userActivityMap.set(item.user_id, { ...current, count: current.count + 1 });
                }
            });

            // Activity from arsip_inaktif
            const { data: arsipInaktifActivity, error: arsipInaktifError } = await supabase
                .from("arsip_inaktif")
                .select("user_id")
                .not("user_id", "is", null);
            if (arsipInaktifError) throw arsipInaktifError;

            arsipInaktifActivity?.forEach(item => {
                if (item.user_id && userActivityMap.has(item.user_id)) {
                    const current = userActivityMap.get(item.user_id)!;
                    userActivityMap.set(item.user_id, { ...current, count: current.count + 1 });
                }
            });

            const aggregatedUserActivity = Array.from(userActivityMap.values())
                .filter(activity => activity.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 15);

            setUserActivityStats(aggregatedUserActivity);

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

    if (authLoading) {
        return <Loading />
    }

    if (error) {
        return (
            <div className="bg-background p-6 w-full h-full flex flex-col items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-destructive mb-4">Terjadi Kesalahan</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <button
                        onClick={fetchDashboardData}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
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
                <Suspense fallback={<StatsLoadingSkeleton />}>
                    {dataLoading ? <StatsLoadingSkeleton /> : <StatsCards stats={stats} />}
                </Suspense>

                <Suspense fallback={<ChartLoadingSkeleton />}>
                    {dataLoading ? <ChartLoadingSkeleton /> : <ActivityChart userActivityStats={userActivityStats} />}
                </Suspense>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={
            <div className="bg-background p-6 w-full h-full">
                <div className="max-w-screen-2xl mx-auto h-full flex items-center justify-center">
                    <LoadingSkeleton />
                </div>
            </div>
        }>
            <AdminDashboardContent />
        </Suspense>
    );
}